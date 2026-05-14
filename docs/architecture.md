# Architecture

## Runtime Flow

```mermaid
sequenceDiagram
  participant User
  participant Frontend as React/Nginx
  participant Backend as Express API
  participant DB as MySQL

  User->>Frontend: Open attendance page
  Frontend->>Backend: GET /api/attendance?date=YYYY-MM-DD
  Backend->>DB: SELECT students + attendance
  DB-->>Backend: Rows
  Backend-->>Frontend: JSON
  User->>Frontend: Save attendance
  Frontend->>Backend: POST /api/attendance
  Backend->>DB: INSERT ... ON DUPLICATE KEY UPDATE
  DB-->>Backend: Saved
  Backend-->>Frontend: Updated list
```

## Business Rules

- Student must exist in `students` before attendance can be saved.
- One student has only one attendance row per day.
- Saving the same student/date updates the existing row.
- Attendance status is limited to `present` and `absent`.
- Statistics count only rows with `status = 'present'`.

## Deployment Units

- Frontend image is built with a multi-stage Dockerfile.
- Backend image installs production dependencies only.
- MySQL data is stored in the `mysql_data` Docker volume.
