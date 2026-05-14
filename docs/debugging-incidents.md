# Debugging and Incidents

## Layer Thinking

- L4 Frontend: UI, browser console, failed fetch, wrong API URL
- L3 Backend: API error, validation, upload parsing, CORS
- L2 External: MySQL connection, schema, volume, storage
- L1 Infrastructure: Docker, port conflict, network, deploy server

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

## Incident 3: Invalid Excel Header

- Symptom: Import API returns `Excel rows must include student code, full name, and class name.`
- Layer: L3 Backend.
- Cause: Uploaded sheet does not contain required columns.
- Fix: Rename columns to `MSSV`, `Họ tên`, `Lớp`.
- Prevention: Share a template file with the class/admin team.
