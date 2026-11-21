# StudySwap API Contract

Version: `1.0.0`  
Protocol: `HTTP/1.1`  
Data Format: `application/json`  
Base URL: `http://localhost:3000`

---

## 1. System Health

### `GET /health`
Verifies backend server status and database connectivity.

- **Request**:
  - Headers: None required
  - Query Parameters: None
  - Body: None

- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "service": "StudySwap Booking API",
    "uptime_seconds": 42,
    "timestamp": "2026-11-21T04:15:00.000Z",
    "database": "sqlite_connected"
  }
  ```

---

## 2. Study Sessions

### `GET /sessions`
Lists all study sessions, including real-time booked counts and remaining capacity.

- **Request**:
  - Headers: None required
  - Body: None

- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": "S1",
      "title": "Algebra",
      "project_day": 8,
      "time": "16:00",
      "capacity": 3,
      "booked_count": 2,
      "available_places": 1
    },
    {
      "id": "S2",
      "title": "Resume review",
      "project_day": 9,
      "time": "17:00",
      "capacity": 2,
      "booked_count": 0,
      "available_places": 2
    },
    {
      "id": "S3",
      "title": "Python",
      "project_day": 10,
      "time": "16:00",
      "capacity": 4,
      "booked_count": 1,
      "available_places": 3
    }
  ]
  ```

---

### `GET /sessions/:id`
Retrieves detailed information for a specific session, including active bookings.

- **URL Parameter**: `id` (e.g. `S1`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "S1",
    "title": "Algebra",
    "project_day": 8,
    "time": "16:00",
    "capacity": 3,
    "booked_count": 1,
    "available_places": 2,
    "bookings": [
      {
        "id": "bkg_a1b2c3d4",
        "alias": "owl42",
        "status": "confirmed",
        "created_at": "2026-11-21 04:15:00",
        "updated_at": "2026-11-21 04:15:00"
      }
    ]
  }
  ```
- **Error Response (`404 Not Found`)**:
  ```json
  {
    "error": "session_not_found",
    "message": "Session with id 'S99' was not found."
  }
  ```

---

## 3. Bookings

### `POST /bookings`
Books a seat in a study session under a fictional alias.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "sessionId": "S1",
    "alias": "owl42"
  }
  ```

- **Validation Rules**:
  - `sessionId`: Required, string, non-empty, must match existing session in database.
  - `alias`: Required, string, non-empty. Fictional alias only.
  - Unique Constraint: The same alias cannot hold more than one active booking for the same session.
  - Capacity Constraint: Cannot exceed `sessions.capacity`. Enforced by SQLite `BEFORE INSERT` trigger.

- **Success Response (`201 Created`)**:
  ```json
  {
    "id": "bkg_7e8b2a1c",
    "sessionId": "S1",
    "alias": "owl42",
    "status": "confirmed",
    "created_at": "2026-11-21 04:15:00",
    "updated_at": "2026-11-21 04:15:00"
  }
  ```

- **Error Responses**:
  - **`400 Bad Request`** (Missing or invalid parameters):
    ```json
    {
      "error": "invalid_input",
      "message": "sessionId is required and cannot be blank."
    }
    ```
  - **`404 Not Found`** (Session does not exist):
    ```json
    {
      "error": "session_not_found",
      "message": "Session with id 'S999' was not found."
    }
    ```
  - **`409 Conflict`** (Session is at full capacity):
    ```json
    {
      "error": "session_full",
      "message": "This session has no places left."
    }
    ```
  - **`409 Conflict`** (Duplicate booking for alias):
    ```json
    {
      "error": "duplicate_booking",
      "message": "Alias 'owl42' already has an active booking for this session."
    }
    ```

---

### `POST /bookings/:id/cancel` & `DELETE /bookings/:id`
Cancels an active booking and immediately releases the reserved seat back into the session pool.

- **URL Parameter**: `id` (e.g. `bkg_7e8b2a1c`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Booking successfully cancelled. Seat has been released.",
    "booking": {
      "id": "bkg_7e8b2a1c",
      "sessionId": "S1",
      "alias": "owl42",
      "status": "cancelled",
      "created_at": "2026-11-21 04:15:00",
      "updated_at": "2026-11-21 04:20:00"
    }
  }
  ```
- **Idempotent Cancellation (`200 OK`)**:
  If the booking was already cancelled, it succeeds without altering capacity:
  ```json
  {
    "message": "Booking is already cancelled.",
    "booking": {
      "id": "bkg_7e8b2a1c",
      "sessionId": "S1",
      "alias": "owl42",
      "status": "cancelled",
      "created_at": "2026-11-21 04:15:00",
      "updated_at": "2026-11-21 04:20:00"
    }
  }
  ```
- **Error Response (`404 Not Found`)**:
  ```json
  {
    "error": "booking_not_found",
    "message": "Booking with id 'bkg_invalid' was not found."
  }
  ```

---

### `GET /bookings/:id`
Retrieves a booking record by ID.

- **URL Parameter**: `id`
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "bkg_7e8b2a1c",
    "sessionId": "S1",
    "alias": "owl42",
    "status": "confirmed",
    "created_at": "2026-11-21 04:15:00",
    "updated_at": "2026-11-21 04:15:00"
  }
  ```

---

## 4. Administrative & Testing

### `POST /reset`
Resets the database by dropping tables, restoring the schema, and reseeding from `sessions.csv`.

- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Database reset and re-seeded successfully.",
    "sessions": [ ... ]
  }
  ```

