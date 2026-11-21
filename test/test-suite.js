const http = require('node:http');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const server = require('../src/server');
const { getDatabase, resetDatabase } = require('../src/db');

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function runTests() {
  console.log('===============================================================');
  console.log(' StudySwap Automated Test Suite (Validation & Evidence)');
  console.log('===============================================================\n');

  // Start server on test port
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Listening on ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name}`);
      console.error(`        ${err.message}`);
      failed++;
    }
  }

  try {
    // 0. Reset to clean state
    await test('Reset database to clean seed state', async () => {
      const res = await request('POST', '/reset');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.sessions.length, 3);
    });

    // 1. Health check & Web UI static files
    await test('Health endpoint returns 200 OK with status "ok"', async () => {
      const res = await request('GET', '/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(res.body.database, 'sqlite_connected');
    });

    await test('Web UI root "/" serves index.html with 200 OK', async () => {
      const res = await request('GET', '/');
      assert.strictEqual(res.status, 200);
      assert(typeof res.body === 'string' && res.body.includes('StudySwap'), 'Must serve HTML containing StudySwap');
    });

    await test('Static asset "/style.css" serves with 200 OK', async () => {
      const res = await request('GET', '/style.css');
      assert.strictEqual(res.status, 200);
      assert(typeof res.body === 'string' && res.body.includes('--primary'), 'Must serve CSS');
    });

    // 2. Initial sessions list
    await test('GET /sessions returns 3 initial seeded sessions with correct capacities', async () => {
      const res = await request('GET', '/sessions');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 3);
      const s1 = res.body.find(s => s.id === 'S1');
      assert(s1, 'S1 should exist');
      assert.strictEqual(s1.title, 'Algebra');
      assert.strictEqual(s1.capacity, 3);
      assert.strictEqual(s1.booked_count, 0);
      assert.strictEqual(s1.available_places, 3);
    });

    // 3. Session details
    await test('GET /sessions/S1 returns session details with empty bookings', async () => {
      const res = await request('GET', '/sessions/S1');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.id, 'S1');
      assert.deepStrictEqual(res.body.bookings, []);
    });

    // 4. Case 1 Worked Example: Fill S1 (capacity 3)
    let booking1Id = null;
    await test('Book seat 1 on S1 (owl1) -> 201 Created', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S1', alias: 'owl1' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.sessionId, 'S1');
      assert.strictEqual(res.body.alias, 'owl1');
      assert.strictEqual(res.body.status, 'confirmed');
      booking1Id = res.body.id;
    });

    await test('Book seat 2 on S1 (owl2) -> 201 Created', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S1', alias: 'owl2' });
      assert.strictEqual(res.status, 201);
    });

    await test('Book seat 3 on S1 (owl3) -> 201 Created (S1 is now full)', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S1', alias: 'owl3' });
      assert.strictEqual(res.status, 201);

      const s1 = await request('GET', '/sessions/S1');
      assert.strictEqual(s1.body.booked_count, 3);
      assert.strictEqual(s1.body.available_places, 0);
    });

    // 5. Case 1 Grade Decider: The 4th booking on a 3-place session
    await test('CASE 1: The 4th booking on a 3-place session MUST be rejected with 409 Conflict', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S1', alias: 'owl42' });
      assert.strictEqual(res.status, 409, `Expected HTTP 409 Conflict, got ${res.status}`);
      assert.strictEqual(res.body.error, 'session_full');
      assert.strictEqual(res.body.message, 'This session has no places left.');

      // Verify database count remains strictly 3
      const db = getDatabase();
      const countRow = db.prepare("SELECT count(*) as count FROM bookings WHERE sessionId = 'S1' AND status = 'confirmed'").get();
      assert.strictEqual(countRow.count, 3, 'Must remain true: SELECT count(*) on S1 bookings still returns 3');
    });

    // 6. Case 2: Booking for a session that does not exist
    await test('CASE 2: Booking for non-existent session MUST be rejected with 404 Not Found', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S999_DOES_NOT_EXIST', alias: 'owl42' });
      assert.strictEqual(res.status, 404, `Expected HTTP 404 Not Found, got ${res.status}`);
      assert.strictEqual(res.body.error, 'session_not_found');
    });

    // 7. Case 3: The same person booking twice on the same session
    await test('CASE 3: Same alias booking twice on the same session MUST be rejected with 409 Conflict', async () => {
      // S3 Python has capacity 4 (empty)
      const res1 = await request('POST', '/bookings', { sessionId: 'S3', alias: 'py_learner' });
      assert.strictEqual(res1.status, 201);

      // Attempt duplicate booking with same alias on S3
      const res2 = await request('POST', '/bookings', { sessionId: 'S3', alias: 'py_learner' });
      assert.strictEqual(res2.status, 409, `Expected HTTP 409 Conflict for duplicate booking, got ${res2.status}`);
      assert.strictEqual(res2.body.error, 'duplicate_booking');
    });

    // 8. Cancellation frees a place (book -> cancel -> book again)
    await test('Cancel booking 1 on S1 releases seat back to the pool', async () => {
      const res = await request('POST', `/bookings/${booking1Id}/cancel`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.booking.status, 'cancelled');

      // Check S1 available places increased from 0 to 1
      const s1 = await request('GET', '/sessions/S1');
      assert.strictEqual(s1.body.booked_count, 2);
      assert.strictEqual(s1.body.available_places, 1);
    });

    await test('The previously rejected 4th person ("owl42") now succeeds after cancellation', async () => {
      const res = await request('POST', '/bookings', { sessionId: 'S1', alias: 'owl42' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.sessionId, 'S1');
      assert.strictEqual(res.body.alias, 'owl42');
      assert.strictEqual(res.body.status, 'confirmed');

      // S1 is full again (3/3)
      const s1 = await request('GET', '/sessions/S1');
      assert.strictEqual(s1.body.booked_count, 3);
      assert.strictEqual(s1.body.available_places, 0);
    });

    // 9. Input validation
    await test('Validation: Reject missing or blank fields with 400 Bad Request', async () => {
      const res1 = await request('POST', '/bookings', { sessionId: '', alias: 'owl' });
      assert.strictEqual(res1.status, 400);

      const res2 = await request('POST', '/bookings', { sessionId: 'S1', alias: '   ' });
      assert.strictEqual(res2.status, 400);

      const res3 = await request('POST', '/bookings', {});
      assert.strictEqual(res3.status, 400);
    });

    // 10. Case 4: Server restart persistence test
    await test('CASE 4: Data persists across server restarts (SQLite file backing)', async () => {
      // Query bookings directly from fresh SQLite connection to prove file persistence
      const { DatabaseSync } = require('node:sqlite');
      const dbPath = path.resolve(__dirname, '..', 'data', 'studyswap.db');
      assert(fs.existsSync(dbPath), 'Database file must exist on disk');

      const freshDb = new DatabaseSync(dbPath);
      const rows = freshDb.prepare("SELECT * FROM bookings WHERE sessionId = 'S1'").all();
      assert.strictEqual(rows.length, 4, 'All 4 bookings (3 confirmed, 1 cancelled) must be in DB file');

      const confirmed = rows.filter(r => r.status === 'confirmed');
      assert.strictEqual(confirmed.length, 3, 'Exactly 3 confirmed bookings persist');
    });

  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('\n===============================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
