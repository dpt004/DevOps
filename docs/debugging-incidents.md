# Debugging and Incidents

## Layer Thinking

- L4 Frontend: UI, browser console, failed fetch, wrong API URL.
- L3 Backend: API error, validation, upload parsing, CORS, auth role.
- L2 External: MySQL connection, schema, volume, import file.
- L1 Infrastructure: Docker, port conflict, network, deploy server.

## Useful Commands

```bash
docker compose ps
docker compose logs frontend --tail 100
docker compose logs backend --tail 100
docker compose logs mysql --tail 100
docker compose exec mysql mysql -uattendance -p attendance_db
```

## Incident 1: Wrong Database Password

- Symptom: `GET /api/health` returns 500 or backend keeps restarting.
- Layer: L2 External.
- Cause: `DB_PASSWORD` does not match `MYSQL_PASSWORD`.
- Fix: Update `.env`, recreate containers with `docker compose up -d --build`.
- Prevention: Keep `.env.example` updated and verify `/api/health` after deploy.

## Incident 2: CORS Error

- Symptom: Frontend loads but API requests fail in browser console.
- Layer: L3 Backend.
- Cause: `CORS_ORIGIN` does not match frontend URL.
- Fix: Set `CORS_ORIGIN` to the deployed frontend URL.
- Prevention: Treat frontend URL as environment config, not hardcoded code.

## Incident 3: Wrong Class Import

- Symptom: Students from one file appear in the wrong class or are mixed into another class.
- Layer: L3 Backend.
- Cause: Import was not tied to the class selected by the teacher/admin.
- Fix: Select the target class before import; backend uses `className` from the form and forces all imported rows into that class.
- Prevention: Keep one file per class and verify the class filter after import.

## Incident 4: Locked Attendance Cannot Be Edited

- Symptom: Save attendance returns HTTP 423.
- Layer: L3 Backend.
- Cause: Attendance for that class/date was already confirmed and locked.
- Fix: Use another date/class or unlock through a controlled admin workflow if that feature is added later.
- Prevention: Review the list before pressing `Xác nhận và khóa`.
