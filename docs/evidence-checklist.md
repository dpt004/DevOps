# Checklist Minh Chứng Demo

## System

- Frontend load được trên URL production.
- Browser Console không có lỗi nghiêm trọng.
- Backend `/api/health` trả `status: ok`.
- API đăng nhập trả token.
- API danh sách lớp/sinh viên/trạng thái điểm danh trả dữ liệu.

Lệnh gợi ý:

```bash
curl https://<render-backend>.onrender.com/api/health
```

## Docker Local/CI

- Có `backend/Dockerfile`.
- Có `frontend/Dockerfile`.
- Có `docker-compose.yml`.
- Chạy local được:

```bash
docker compose up -d --build
docker compose ps
docker compose logs backend --tail 100
```

Ảnh cần lưu:

- Build image thành công.
- Container backend/mysql healthy khi chạy local.
- Log backend có `database migration completed`, `database seed completed`, `backend listening`.

## CI

- GitHub Actions chạy khi push/pull request vào `main` hoặc `dev`.
- Backend có `npm ci`, lint, test, build.
- Frontend có `npm ci`, lint, test, build.
- Docker job có `docker compose config` và `docker compose build`.

Ảnh cần lưu:

- Màn hình GitHub Actions pass.
- Chi tiết từng job backend/frontend/docker pass.

## Environment

- Có `.env.example`.
- `.env` không được commit.
- Không hardcode secret trong source.
- Vercel có `VITE_API_BASE_URL`.
- Render có `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_SSL_CA_BASE64`, `CORS_ORIGIN`, `AUTH_TOKEN_SECRET`.
- Khi demo production phải che password, token secret và CA certificate.

## Deploy

- Frontend production chạy trên Vercel.
- Backend production chạy trên Render.
- Database production chạy trên Aiven MySQL.
- URL production hiện tại: `https://sasdau.vercel.app`.
- Backend API production dùng domain Render: `https://<render-backend>.onrender.com`.
- Chứng minh redeploy được bằng Vercel Deployments và Render Deploys.

Ảnh cần lưu:

- Vercel deployment succeeded.
- Frontend production load được.
- Render backend deploy succeeded.
- Backend health production OK.
- Aiven MySQL ở trạng thái `Running`.
- Render logs backend start thành công.

## Debug

Chuẩn bị ít nhất 3 incident:

- Backend Render không kết nối Aiven MySQL.
- CORS/ENV sai giữa Vercel và Render.
- Port bị chiếm khi chạy Docker local.

Mỗi incident cần có:

- Hiện tượng.
- Layer lỗi.
- Nguyên nhân.
- Cách fix.
- Cách phòng tránh.
- Ảnh trước/sau khi fix.

## Role Trình Bày

| Vai trò | Nội dung nên trình bày |
| --- | --- |
| Backend | API, database schema, auth, attendance logic |
| Frontend | UI, luồng điểm danh, import, report |
| DevOps | Docker local/CI, GitHub Actions, Vercel, Render, Aiven, ENV, logging/debug |
| QA/Docs | Test case, incident report, checklist minh chứng |
