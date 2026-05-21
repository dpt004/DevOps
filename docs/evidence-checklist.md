# Checklist minh chứng demo

## System

- Frontend load được trên URL demo/production.
- Browser console không có lỗi nghiêm trọng.
- Backend `/api/health` trả `status: ok`.
- API đăng nhập trả token.
- API danh sách lớp/sinh viên/trạng thái điểm danh trả dữ liệu.

Lệnh gợi ý:

```bash
curl http://localhost:4000/api/health
```

## Docker

- Có `backend/Dockerfile`.
- Có `frontend/Dockerfile`.
- Có `docker-compose.yml`.
- Chạy được:

```bash
docker compose up -d --build
docker compose ps
docker compose logs backend --tail 100
```

Ảnh cần lưu:

- Build image thành công.
- Container backend/mysql healthy.
- Log backend có `database migration completed`, `database seed completed`, `backend listening`.

## CI

- GitHub Actions chạy khi push/pull request.
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
- Khi demo production phải sửa `CORS_ORIGIN`, `AUTH_TOKEN_SECRET`, mật khẩu database.

## Deploy

- Có URL production hoặc môi trường VPS/WSL Ubuntu chạy Docker Compose.
- Chứng minh redeploy được:

```bash
git pull
docker compose up -d --build
docker compose ps
```

Ảnh cần lưu:

- Frontend production load được.
- Backend health production OK.
- Log container production.

## Debug

Chuẩn bị ít nhất 3 incident:

- Backend không kết nối MySQL.
- Port bị chiếm.
- CORS/ENV sai.

Mỗi incident cần có:

- Hiện tượng.
- Layer lỗi.
- Nguyên nhân.
- Cách fix.
- Cách phòng tránh.
- Ảnh trước/sau khi fix.

## Role trình bày

| Vai trò | Nội dung nên trình bày |
| --- | --- |
| Backend | API, database schema, auth, attendance logic |
| Frontend | UI, luồng điểm danh, import, report |
| DevOps | Docker, CI/CD, deploy, ENV, logging/debug |
| QA/Docs | Test case, incident report, checklist minh chứng |
