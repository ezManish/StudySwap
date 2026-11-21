const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {
  initSchema,
  seedSessions,
  resetDatabase,
  getSessions,
  getSessionById,
  createBooking,
  cancelBooking,
  getBookingById,
  listAllBookings
} = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

// Initialize database schema and ensure seed data is present on startup
initSchema();
const currentSessions = getSessions();
if (currentSessions.length === 0) {
  console.log('No sessions found in database. Seeding initial sessions...');
  seedSessions();
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        const parseErr = new Error('Malformed JSON payload.');
        parseErr.status = 400;
        parseErr.code = 'invalid_json';
        reject(parseErr);
      }
    });
    req.on('error', err => reject(err));
  });
}

function serveStaticFile(reqPath, res) {
  let cleanPath = decodeURIComponent(reqPath.split('?')[0]).replace(/^[\\\/]+/, '');
  if (!cleanPath || cleanPath === '.' || cleanPath === 'index.html') {
    cleanPath = 'index.html';
  }

  const safePath = path.normalize(cleanPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // --- API Routes ---

    // 1. Health check
    if (pathname === '/health' && method === 'GET') {
      return sendJSON(res, 200, {
        status: 'ok',
        service: 'StudySwap Booking API',
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: 'sqlite_connected'
      });
    }

    // 2. Reset database endpoint (for test reproducibility)
    if (pathname === '/reset' && method === 'POST') {
      const seeded = resetDatabase();
      return sendJSON(res, 200, {
        message: 'Database reset and re-seeded successfully.',
        sessions: seeded
      });
    }

    // 3. List sessions: GET /sessions
    if (pathname === '/sessions' && method === 'GET') {
      const sessions = getSessions();
      return sendJSON(res, 200, sessions);
    }

    // 4. Get single session: GET /sessions/:id
    const sessionMatch = pathname.match(/^\/sessions\/([a-zA-Z0-9_\-]+)$/);
    if (sessionMatch && method === 'GET') {
      const sessionId = sessionMatch[1];
      const session = getSessionById(sessionId);
      if (!session) {
        return sendJSON(res, 404, {
          error: 'session_not_found',
          message: `Session with id '${sessionId}' was not found.`
        });
      }
      return sendJSON(res, 200, session);
    }

    // 5. List all bookings: GET /bookings
    if (pathname === '/bookings' && method === 'GET') {
      const bookings = listAllBookings();
      return sendJSON(res, 200, bookings);
    }

    // 6. Create booking: POST /bookings
    if (pathname === '/bookings' && method === 'POST') {
      const body = await parseJSONBody(req);
      const { sessionId, alias } = body;

      try {
        const booking = createBooking(sessionId, alias);
        return sendJSON(res, 201, booking);
      } catch (err) {
        const status = err.status || 500;
        return sendJSON(res, status, {
          error: err.code || 'internal_error',
          message: err.message
        });
      }
    }

    // 7. Cancel booking: POST /bookings/:id/cancel or DELETE /bookings/:id
    const cancelMatch = pathname.match(/^\/bookings\/([a-zA-Z0-9_\-]+)\/cancel$/);
    const deleteMatch = pathname.match(/^\/bookings\/([a-zA-Z0-9_\-]+)$/);

    if ((cancelMatch && method === 'POST') || (deleteMatch && method === 'DELETE')) {
      const bookingId = (cancelMatch ? cancelMatch[1] : deleteMatch[1]);
      try {
        const result = cancelBooking(bookingId);
        return sendJSON(res, 200, result);
      } catch (err) {
        const status = err.status || 500;
        return sendJSON(res, status, {
          error: err.code || 'internal_error',
          message: err.message
        });
      }
    }

    // 8. Get booking by id: GET /bookings/:id
    if (deleteMatch && method === 'GET') {
      const bookingId = deleteMatch[1];
      const booking = getBookingById(bookingId);
      if (!booking) {
        return sendJSON(res, 404, {
          error: 'booking_not_found',
          message: `Booking with id '${bookingId}' was not found.`
        });
      }
      return sendJSON(res, 200, booking);
    }

    // --- Static Frontend Files ---
    if (method === 'GET') {
      return serveStaticFile(pathname, res);
    }

    // Fallback for unhandled routes
    return sendJSON(res, 404, {
      error: 'route_not_found',
      message: `Cannot ${method} ${pathname}`
    });

  } catch (error) {
    console.error('Unhandled server error:', error);
    return sendJSON(res, 500, {
      error: 'server_error',
      message: error.message || 'An unexpected error occurred.'
    });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` StudySwap Server running at: http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    console.log(` Web UI:       http://localhost:${PORT}/`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
