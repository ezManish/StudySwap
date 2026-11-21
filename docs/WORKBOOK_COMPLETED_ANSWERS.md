# Student Workbook — Completed Reference Guide

Use this document to populate your copy of `student-workbook.docx` or Google Doc submission.

---

## 00 Start Here
- **Your name or alias**: Learner / Submitter
- **Chosen tool and version**: Node.js `v24.18.0` (with built-in `node:http` and `node:sqlite`), npm `12.2.3`
- **Weekly time plan**: 6–8 hours/week across 2 weeks
- **My current skills and one learning goal**:
  - *Current skills*: JavaScript, Node.js fundamentals, SQL basics.
  - *Learning goal*: Master atomic concurrency control and data-layer constraints to eliminate race conditions without naive application `if` checks.
- **My smallest working example and where its evidence is saved**:
  - `GET /health` responding with HTTP 200 OK and database connectivity verification, saved in `test/test-suite.js` and `evidence-log.csv`.

---

## 01 Run the Smallest System (Checkpoint 01)
- **Mission**: Write stories/data model; run page and backend health endpoint.
- **Deliverables**: `README.md`, `docs/ARCHITECTURE.md` (Entity Diagram), and working health check evidence.
- **My decision and why the evidence supports it**:
  - Built with Node.js and embedded SQLite. Instead of in-memory structures or heavy database engines, SQLite is file-backed (`data/studyswap.db`) and requires zero cloud configuration.
- **Evidence file or link**:
  - `src/server.js` (`GET /health`), `README.md` (Entity diagram & setup), `evidence-log.csv` (TEST-01).

---

## 02 Define API and Storage (Checkpoint 02)
- **Mission**: Specify routes/validation; seed sessions and persist bookings.
- **Deliverables**: `docs/API_CONTRACT.md`, `src/db.js` (schema/seed), request/response examples.
- **My decision and why the evidence supports it**:
  - Seeded initial sessions from `data/sessions.csv` (`S1 Algebra`, `S2 Resume review`, `S3 Python`).
  - Added unique index `idx_unique_active_booking` on `(sessionId, alias)` where `status = 'confirmed'` to reject duplicate active bookings by the same alias.
- **Evidence file or link**:
  - `data/sessions.csv`, `src/seed.js`, `docs/API_CONTRACT.md`, `evidence-log.csv` (TEST-02, TEST-06, TEST-07).

---

## 03 Connect the Core Journey (Checkpoint 03)
- **Mission**: Implement browse, book, cancel with loading/empty/error states.
- **Deliverables**: `public/index.html`, `public/app.js`, `public/style.css`, full lifecycle flow.
- **My decision and why the evidence supports it**:
  - Integrated full cycle: booking decrements available capacity; cancelling via `POST /bookings/:id/cancel` sets `status = 'cancelled'` and immediately returns the place to the session pool.
  - Provided interactive single-page dashboard with real-time feedback, alias generator, and API console logger.
- **Evidence file or link**:
  - `public/index.html`, `public/app.js`, `evidence-log.csv` (TEST-08, TEST-09).

---

## 04 Try to Break It (Checkpoint 04)
- **Mission**: Test boundaries, malformed inputs, duplicate clicks, restart.
- **Deliverables**: 14 automated tests in `test/test-suite.js` and concurrency stress test in `test/test-concurrency.js`.
- **My decision and why the evidence supports it**:
  - Enforced capacity at the data layer using SQLite `BEFORE INSERT` trigger `check_session_capacity_before_insert` combined with `BEGIN IMMEDIATE` transaction write locks.
  - Fired 10 concurrent requests at the exact same millisecond against S2 (capacity 2). Exactly 2 succeeded (`201 Created`) and 8 were blocked (`409 Conflict`). Overbooking rate: 0.0%.
- **Evidence file or link**:
  - `test/test-suite.js`, `test/test-concurrency.js`, `evidence-log.csv` (TEST-04, TEST-05, TEST-11).

---

## 05 Improve Robustness (Checkpoint 05)
- **Mission**: Fix priority bugs and behavior; add useful logs and error handling.
- **Deliverables**: Robust error mapping, idempotent cancellation, `worksheet-05.csv`.
- **My decision and why the evidence supports it**:
  - Replaced naive status codes with exact REST mappings: `400 Bad Request` for blank/missing inputs, `404 Not Found` for invalid IDs, and `409 Conflict` for capacity exhaustion or duplicate aliases.
  - Made cancellation idempotent (repeating cancellation on an already cancelled booking returns HTTP 200 without side effects).
- **Evidence file or link**:
  - `src/server.js`, `worksheet-05.csv`.

---

## 06 Ship Reproducibly (Checkpoint 06)
- **Mission**: Package setup, seed/reset, architecture and demo.
- **Deliverables**: Clean 10-minute setup in `README.md`, `file-index.csv`, `evidence-log.csv`.
- **My decision and why the evidence supports it**:
  - Used 100% built-in Node.js modules (`node:http`, `node:sqlite`, `node:fs`). Anyone with Node installed can clone and execute `npm run seed && npm start` in under 30 seconds with zero download dependencies or compilation errors.
- **Evidence file or link**:
  - `README.md`, `file-index.csv`, `worksheet-06.csv`.

---

## Final Reflection
- **One limitation**:
  - SQLite uses a single-writer file lock (`WAL` mode). While optimal for single-node embedded systems and zero-overhead setups, multi-node distributed deployments across several physical servers would benefit from PostgreSQL row-level locks (`SELECT FOR UPDATE`) or Redis distributed locks.
- **Next step**:
  - Introduce an automated waitlist promotion queue: when an active attendee cancels, the first student on the waitlist is automatically promoted to `confirmed`.

