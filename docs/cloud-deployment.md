# Cloud Deployment: Vercel + Render + Aiven

## Target Architecture

- Frontend: Vercel, build from `frontend/`.
- Backend API: Render Web Service, build from `backend/Dockerfile`.
- Database: Aiven Free MySQL.

Vercel does not run Docker Compose or MySQL containers. Render private services
and persistent disks require payment information, so the no-card deployment path
uses Aiven Free MySQL for the database and Render Free Web Service for the API.

## 1. Push Code

```powershell
git add .env.example backend/src/app.js backend/src/config.js backend/src/db/pool.js docker-compose.yml frontend/vercel.json render.yaml docs/cloud-deployment.md
git commit -m "chore: prepare cloud deployment"
git push origin main
```

Wait for GitHub Actions to pass before deploying.

## 2. Create Free MySQL On Aiven

1. Open Aiven Console.
2. Create a free Aiven for MySQL service.
3. Wait until the service status is running.
4. In the service overview, copy:

```text
Host
Port
Database
User
Password
CA certificate
```

5. Convert the CA certificate to Base64 before adding it to Render:

```bash
base64 -w 0 ca.pem
```

If you are on Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ca.pem"))
```

## 3. Deploy Backend On Render

1. Open Render Dashboard.
2. New > Blueprint.
3. Connect the GitHub repository.
4. Select `render.yaml`.
5. When Render asks for environment values, use the Aiven values:

```text
DB_HOST=<aiven mysql host>
DB_PORT=<aiven mysql port>
DB_NAME=<aiven database name>
DB_USER=<aiven database user>
DB_PASSWORD=<aiven database password>
DB_SSL_CA_BASE64=<base64 value from ca.pem>
CORS_ORIGIN=*
SEED_ADMIN_PASSWORD=<strong admin password>
SEED_TEACHER_PASSWORD=<strong teacher password>
SEED_STUDENT_PASSWORD=<strong student password>
```

Use `CORS_ORIGIN=*` only for the first deploy if the Vercel URL is not known yet.
After Vercel deploys, change it to the exact frontend URL.

Render will create `attendance-backend` as a public backend API service.

After deploy, verify:

```text
https://<attendance-backend>.onrender.com/api/health
```

## 4. Deploy Frontend On Vercel

1. Open Vercel Dashboard.
2. Add New Project > Import GitHub repository.
3. Set Root Directory to `frontend`.
4. Framework Preset: Vite.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Add environment variable:

```text
VITE_API_BASE_URL=https://<attendance-backend>.onrender.com/api
```

Deploy and copy the Vercel production URL:

```text
https://<project>.vercel.app
```

## 5. Lock CORS To Frontend URL

Return to Render > `attendance-backend` > Environment.

Change:

```text
CORS_ORIGIN=https://<project>.vercel.app
```

Redeploy the backend.

## 6. Smoke Test

Backend:

```bash
curl https://<attendance-backend>.onrender.com/api/health
```

Frontend:

Open:

```text
https://<project>.vercel.app
```

Log in with the production seed passwords configured on Render.

## 7. Evidence For Demo

- GitHub Actions passed.
- Render backend deploy succeeded.
- Aiven MySQL service running.
- Backend `/api/health` returns `status: ok` and `database: ok`.
- Vercel frontend public URL loads.
- Browser DevTools Console has no runtime errors.
- Render backend logs are visible.
