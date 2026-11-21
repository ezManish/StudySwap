const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'studyswap.db');
const SEED_CSV_PATH = path.resolve(__dirname, '..', 'data', 'sessions.csv');

let dbInstance = null;

function getDatabase(customPath) {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || DB_PATH;
  const dbDir = path.dirname(targetPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function initSchema(db = getDatabase()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_day INTEGER NOT NULL,
      time TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      alias TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE RESTRICT
    );

    -- Enforce that a user/alias cannot have more than one ACTIVE confirmed booking for the same session
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking 
    ON bookings(sessionId, alias) 
    WHERE status = 'confirmed';

    -- Trigger: Enforces session capacity directly at the data layer on INSERT
    CREATE TRIGGER IF NOT EXISTS check_session_capacity_before_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW
    WHEN NEW.status = 'confirmed' AND (
      SELECT COUNT(*) FROM bookings 
      WHERE sessionId = NEW.sessionId AND status = 'confirmed'
    ) >= (
      SELECT capacity FROM sessions WHERE id = NEW.sessionId
    )
    BEGIN
      SELECT RAISE(ABORT, 'CAPACITY_EXCEEDED');
    END;

    -- Trigger: Enforces session capacity directly at the data layer on UPDATE (e.g. un-cancelling)
    CREATE TRIGGER IF NOT EXISTS check_session_capacity_before_update
    BEFORE UPDATE OF status ON bookings
    FOR EACH ROW
    WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND (
      SELECT COUNT(*) FROM bookings 
      WHERE sessionId = NEW.sessionId AND status = 'confirmed'
    ) >= (
      SELECT capacity FROM sessions WHERE id = NEW.sessionId
    )
    BEGIN
      SELECT RAISE(ABORT, 'CAPACITY_EXCEEDED');
    END;
  `);
}

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    rows.push(row);
  }
  return rows;
}

function seedSessions(csvPath = SEED_CSV_PATH, db = getDatabase()) {
  initSchema(db);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Seed CSV file not found at: ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(fileContent);

  const insertStmt = db.prepare(`
    INSERT INTO sessions (id, title, project_day, time, capacity)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      project_day = excluded.project_day,
      time = excluded.time,
      capacity = excluded.capacity
  `);

  db.exec('BEGIN IMMEDIATE;');
  try {
    for (const record of records) {
      insertStmt.run(
        record.id,
        record.title,
        parseInt(record.project_day, 10),
        record.time,
        parseInt(record.capacity, 10)
      );
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return records;
}

function resetDatabase(db = getDatabase()) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.exec(`
      DROP TRIGGER IF EXISTS check_session_capacity_before_insert;
      DROP TRIGGER IF EXISTS check_session_capacity_before_update;
      DROP INDEX IF EXISTS idx_unique_active_booking;
      DROP TABLE IF EXISTS bookings;
      DROP TABLE IF EXISTS sessions;
    `);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  initSchema(db);
  return seedSessions(SEED_CSV_PATH, db);
}

function getSessions(db = getDatabase()) {
  const stmt = db.prepare(`
    SELECT 
      s.id,
      s.title,
      s.project_day,
      s.time,
      s.capacity,
      COALESCE(b.booked_count, 0) as booked_count,
      (s.capacity - COALESCE(b.booked_count, 0)) as available_places
    FROM sessions s
    LEFT JOIN (
      SELECT sessionId, COUNT(*) as booked_count 
      FROM bookings 
      WHERE status = 'confirmed' 
      GROUP BY sessionId
    ) b ON s.id = b.sessionId
    ORDER BY s.project_day ASC, s.time ASC
  `);
  return stmt.all();
}

function getSessionById(id, db = getDatabase()) {
  const sessionStmt = db.prepare(`
    SELECT 
      s.id,
      s.title,
      s.project_day,
      s.time,
      s.capacity,
      COALESCE(b.booked_count, 0) as booked_count,
      (s.capacity - COALESCE(b.booked_count, 0)) as available_places
    FROM sessions s
    LEFT JOIN (
      SELECT sessionId, COUNT(*) as booked_count 
      FROM bookings 
      WHERE status = 'confirmed' 
      GROUP BY sessionId
    ) b ON s.id = b.sessionId
    WHERE s.id = ?
  `);
  const session = sessionStmt.get(id);
  if (!session) return null;

  const bookingsStmt = db.prepare(`
    SELECT id, alias, status, created_at, updated_at
    FROM bookings
    WHERE sessionId = ?
    ORDER BY created_at ASC
  `);
  session.bookings = bookingsStmt.all(id);
  return session;
}

function createBooking(sessionId, alias, db = getDatabase()) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    const err = new Error('sessionId is required and cannot be blank.');
    err.code = 'invalid_input';
    err.status = 400;
    throw err;
  }
  if (!alias || typeof alias !== 'string' || !alias.trim()) {
    const err = new Error('alias is required and cannot be blank.');
    err.code = 'invalid_input';
    err.status = 400;
    throw err;
  }
  sessionId = sessionId.trim();
  alias = alias.trim();

  // Validate session exists before attempting insert
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    const err = new Error(`Session with id '${sessionId}' was not found.`);
    err.code = 'session_not_found';
    err.status = 404;
    throw err;
  }

  const bookingId = 'bkg_' + crypto.randomUUID().slice(0, 8);

  // Atomic insert with BEGIN IMMEDIATE to serialize concurrent requests
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(`
      INSERT INTO bookings (id, sessionId, alias, status, created_at, updated_at)
      VALUES (?, ?, ?, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(bookingId, sessionId, alias);
    
    db.exec('COMMIT;');
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  } catch (sqliteErr) {
    try { db.exec('ROLLBACK;'); } catch (_) {}

    const msg = sqliteErr.message || '';
    if (msg.includes('CAPACITY_EXCEEDED')) {
      const err = new Error('This session has no places left.');
      err.code = 'session_full';
      err.status = 409;
      throw err;
    }
    if (msg.includes('UNIQUE constraint failed') || msg.includes('idx_unique_active_booking')) {
      const err = new Error(`Alias '${alias}' already has an active booking for this session.`);
      err.code = 'duplicate_booking';
      err.status = 409;
      throw err;
    }
    if (msg.includes('FOREIGN KEY constraint failed')) {
      const err = new Error(`Session with id '${sessionId}' does not exist.`);
      err.code = 'session_not_found';
      err.status = 404;
      throw err;
    }
    throw sqliteErr;
  }
}

function cancelBooking(id, db = getDatabase()) {
  if (!id || typeof id !== 'string' || !id.trim()) {
    const err = new Error('Booking ID is required.');
    err.code = 'invalid_input';
    err.status = 400;
    throw err;
  }
  id = id.trim();

  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!existing) {
    const err = new Error(`Booking with id '${id}' was not found.`);
    err.code = 'booking_not_found';
    err.status = 404;
    throw err;
  }

  // Idempotent cancellation: if already cancelled, return existing state with notice
  if (existing.status === 'cancelled') {
    return {
      message: 'Booking is already cancelled.',
      booking: existing
    };
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(`
      UPDATE bookings 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    db.exec('COMMIT;');

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return {
      message: 'Booking successfully cancelled. Seat has been released.',
      booking: updated
    };
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    throw err;
  }
}

function getBookingById(id, db = getDatabase()) {
  if (!id) return null;
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id.trim()) || null;
}

function listAllBookings(db = getDatabase()) {
  const stmt = db.prepare(`
    SELECT b.id, b.sessionId, s.title as session_title, b.alias, b.status, b.created_at, b.updated_at
    FROM bookings b
    JOIN sessions s ON b.sessionId = s.id
    ORDER BY b.created_at DESC
  `);
  return stmt.all();
}

module.exports = {
  DB_PATH,
  SEED_CSV_PATH,
  getDatabase,
  initSchema,
  seedSessions,
  resetDatabase,
  getSessions,
  getSessionById,
  createBooking,
  cancelBooking,
  getBookingById,
  listAllBookings
};

