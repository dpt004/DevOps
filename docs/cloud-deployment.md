# Cloud Deployment: Vercel + Render

## Target Architecture

- Frontend: Vercel, build from `frontend/`.
- Backend API: Render Web Service, build from `backend/Dockerfile`.
- Database: Render Private Service running `mysql:8.4` with persistent disk.

Vercel does not run Docker Compose or MySQL containers, so this project uses
Render for the backend and database.

## 1. Push Code

```powershell
git add .env.example backend/src/app.js backend/src/config.js docker-compose.yml scripts/smoke-test.sh frontend/vercel.json render.yaml docs/cloud-deployment.md
git commit -m "chore: prepare cloud deployment"
git push origin main
```

Wait for GitHub Actions to pass before deploying.

## 2. Deploy Backend And MySQL On Render

1. Open Render Dashboard.
2. New > Blueprint.
3. Connect the GitHub repository.
4. Select `render.yaml`.
5. When Render asks for secret values, use production values:

```text
MYSQL_PASSWORD=<strong mysql user password>
MYSQL_ROOT_PASSWORD=<strong mysql root password>
CORS_ORIGIN=*
SEED_ADMIN_PASSWORD=<strong admin password>
SEED_TEACHER_PASSWORD=<strong teacher password>
SEED_STUDENT_PASSWORD=<strong student password>
```

Use `CORS_ORIGIN=*` only for the first deploy if the Vercel URL is not known yet.
After Vercel deploys, change it to the exact frontend URL.

Render will create:

- `attendance-mysql`: private MySQL service.
- `attendance-backend`: public backend API service.

After deploy, verify:

```text
https://<attendance-backend>.onrender.com/api/health
```

## 3. Deploy Frontend On Vercel

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

## 4. Lock CORS To Frontend URL

Return to Render > `attendance-backend` > Environment.

Change:

```text
CORS_ORIGIN=https://<project>.vercel.app
```

Redeploy the backend.

## 5. Smoke Test

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

## 6. Evidence For Demo

- GitHub Actions passed.
- Render backend deploy succeeded.
- Render MySQL private service running.
- Backend `/api/health` returns `status: ok` and `database: ok`.
- Vercel frontend public URL loads.
- Browser DevTools Console has no runtime errors.
- Render backend logs are visible.
