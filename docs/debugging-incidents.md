# Debugging Và Incident

## Nguyên Tắc Debug Theo Layer

Không debug bằng cách đoán mò. Khi lỗi xảy ra, xác định lỗi nằm ở layer nào trước.

| Layer | Thành phần | Dấu hiệu thường gặp | Local/CI | Production |
| --- | --- | --- | --- | --- |
| L4 Frontend | React/browser | Trắng màn hình, click không phản hồi, API bị chặn | Browser Console, Network | Vercel deployment, Browser Console, Network |
| L3 Backend | Express API | API 500, health fail, validate fail | `docker compose logs backend --tail 100` | Render logs, `/api/health` |
| L2 Database | MySQL | Backend không kết nối DB, migration fail | `docker compose logs mysql --tail 100` | Aiven status, logs/events |
| L1 Infrastructure | ENV/network/deploy | Service không start, sai env, CORS sai | `docker compose ps`, `docker compose config` | Render env, Vercel env, deploy logs |

## Checklist Debug Nhanh Production

1. Mở frontend Vercel và kiểm tra DevTools Console.
2. Mở DevTools Network, bấm thao tác lỗi và xem request đang gọi URL nào.
3. Kiểm tra backend health:

```bash
curl https://<render-backend>.onrender.com/api/health
```

4. Mở Render logs ngay thời điểm lỗi.
5. Kiểm tra Aiven MySQL đang `Running`.
6. Kiểm tra env:
   - Vercel: `VITE_API_BASE_URL`.
   - Render: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_SSL_CA_BASE64`, `CORS_ORIGIN`, `AUTH_TOKEN_SECRET`.

## Checklist Debug Local

```bash
docker compose ps
curl http://localhost:4000/api/health
docker compose logs backend --tail 100
docker compose logs mysql --tail 100
docker compose config
```

## Incident 1: Backend Render Không Kết Nối Được Aiven MySQL

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | Login pending, `/api/health` fail, Render báo backend failed to start |
| Layer lỗi | L2 Database / L3 Backend |
| Nguyên nhân | Aiven đang `Rebuilding`, host sai, database bị pause/xóa, password/env sai hoặc SSL CA sai |
| Cách xác định | Xem Render logs; kiểm tra Aiven service status và connection information |
| Cách fix | Chờ Aiven `Running`; cập nhật Render env từ Aiven; redeploy/restart backend |
| Phòng tránh | Lưu checklist env, không hardcode DB URL, smoke test sau deploy |

Log ví dụ:

```text
backend failed to start
getaddrinfo ENOTFOUND mysql-xxxxx.aivencloud.com
```

Minh chứng nên lưu:

- Ảnh Render logs báo lỗi DB.
- Ảnh Aiven service `Running`.
- Ảnh Render env đã sửa, che secret.
- Ảnh `/api/health` OK sau khi fix.

## Incident 2: CORS/ENV Sai Giữa Vercel Và Render

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | Frontend load được nhưng API login/request thất bại hoặc preflight bị chặn |
| Layer lỗi | L4 Frontend / L3 Backend config |
| Nguyên nhân | `CORS_ORIGIN` trên Render không khớp URL Vercel hoặc `VITE_API_BASE_URL` trên Vercel trỏ sai backend |
| Cách xác định | DevTools Network, kiểm tra `Request URL`, `Origin`, preflight `OPTIONS` |
| Cách fix | Sửa `CORS_ORIGIN=https://sasdau.vercel.app`; sửa `VITE_API_BASE_URL=https://<render-backend>.onrender.com/api`; redeploy |
| Phòng tránh | Ghi rõ URL production trong tài liệu deploy, smoke test login sau mỗi deploy |

Minh chứng nên lưu:

- Ảnh Network request bị lỗi.
- Ảnh env trước/sau khi sửa, che secret.
- Ảnh request API thành công sau khi fix.

## Incident 3: Port Backend Hoặc Frontend Bị Chiếm Khi Chạy Local

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | `docker compose up` báo không bind được port `4000`, `8080` hoặc `3307` |
| Layer lỗi | L1 Infrastructure |
| Nguyên nhân | Process/container khác đang dùng cùng port |
| Cách xác định | `docker compose ps`, `netstat -ano | findstr :4000` trên Windows hoặc `sudo lsof -i :4000` trên Linux |
| Cách fix | Dừng process đang chiếm port hoặc đổi `BACKEND_PORT`, `FRONTEND_PORT`, `MYSQL_PORT` trong `.env` |
| Phòng tránh | Chuẩn hóa port trong `.env.example`, kiểm tra port trước khi demo |

## Incident 4: Dependency Audit Báo Lỗ Hổng `xlsx`

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | `npm ci` backend thành công nhưng `npm audit` báo vulnerability liên quan `xlsx` |
| Layer lỗi | L1 Tooling / Supply chain |
| Nguyên nhân | Package `xlsx` có advisory bảo mật và chưa có bản fix phù hợp |
| Cách xác định | `npm audit --omit=dev` trong thư mục `backend` |
| Cách fix | Theo dõi bản vá package, cân nhắc thay parser Excel nếu advisory ảnh hưởng production, giới hạn file upload 5MB và chỉ cho user đã đăng nhập import |
| Phòng tránh | Chạy audit định kỳ, khóa dependency bằng `package-lock.json`, hạn chế quyền import theo role |

## Incident 5: Test/Build Backend Bị Treo Do Khởi Tạo DB Quá Sớm

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | `npm test` hoặc `npm run build` backend bị treo hoặc phụ thuộc MySQL thật |
| Layer lỗi | L3 Backend |
| Nguyên nhân | MySQL pool được tạo ngay khi import module |
| Cách xác định | Chạy `npm test` hoặc `npm run build` trong `backend`, kiểm tra stack/log liên quan `pool.js` |
| Cách fix | Lazy-init database pool, chỉ tạo pool khi có query thật và thêm `closePool()` để test/script đóng kết nối |
| Phòng tránh | Tách logic thuần khỏi kết nối hạ tầng, viết test cho service không phụ thuộc DB thật |

## Kịch Bản Demo Debug

Kịch bản production nên demo:

1. Đổi tạm `CORS_ORIGIN` trên Render sang URL sai.
2. Redeploy backend.
3. Mở frontend Vercel và DevTools Network để thấy request bị chặn.
4. Sửa lại `CORS_ORIGIN=https://sasdau.vercel.app`.
5. Redeploy backend và chứng minh request API thành công.

Kịch bản local nên demo:

1. Đổi port trong `.env` hoặc tạo tình huống port bị chiếm.
2. Chạy `docker compose up -d --build`.
3. Xác định layer L1 bằng `docker compose ps` hoặc lỗi bind port.
4. Sửa `.env`, chạy lại compose.
5. Chứng minh `/api/health` OK và frontend gọi API được.
