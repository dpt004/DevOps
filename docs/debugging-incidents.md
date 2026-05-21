# Debugging và incident

## Nguyên tắc debug theo layer

Không debug bằng cách đoán mò. Khi lỗi xảy ra, xác định lỗi nằm ở layer nào trước:

| Layer | Thành phần | Dấu hiệu thường gặp | Lệnh kiểm tra |
| --- | --- | --- | --- |
| L4 Frontend | React/Nginx/browser | Trắng màn hình, console error, API bị chặn | Browser console, Network tab |
| L3 Backend | Express API | API 500, health fail, lỗi validate | `docker compose logs backend --tail 100` |
| L2 External | MySQL | Backend không kết nối DB, migration fail | `docker compose logs mysql --tail 100` |
| L1 Infrastructure | Docker, port, ENV, network | Container không start, port bị chiếm, sai ENV | `docker compose ps`, `docker compose config` |

## Checklist debug nhanh

1. Kiểm tra container:

```bash
docker compose ps
```

2. Kiểm tra backend health:

```bash
curl http://localhost:4000/api/health
```

3. Xem log backend:

```bash
docker compose logs backend --tail 100
```

4. Xem log database:

```bash
docker compose logs mysql --tail 100
```

5. Kiểm tra cấu hình compose đã render đúng ENV:

```bash
docker compose config
```

## Incident 1: Backend không kết nối được MySQL

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | Backend không healthy, `/api/health` lỗi hoặc trả database unhealthy |
| Layer lỗi | L2 Database / L3 Backend |
| Nguyên nhân | Sai `DB_HOST`, `DB_USER`, `DB_PASSWORD`, database chưa healthy hoặc container MySQL chưa sẵn sàng |
| Cách xác định | `docker compose ps`, `docker compose logs backend --tail 100`, `docker compose logs mysql --tail 100` |
| Cách fix | Sửa `.env`, chạy `docker compose up -d --build`, bảo đảm backend dùng `DB_HOST=mysql` khi chạy trong Docker |
| Phòng tránh | Dùng `.env.example`, healthcheck MySQL, `depends_on.condition: service_healthy`, không hardcode connection string |

Minh chứng nên lưu:

- Ảnh log backend báo lỗi kết nối DB.
- Ảnh `.env` đã sửa, che mật khẩu.
- Ảnh `/api/health` trả `status: ok` sau khi fix.

## Incident 2: Port backend hoặc frontend bị chiếm

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | `docker compose up` báo không bind được port `4000`, `8080` hoặc `3307` |
| Layer lỗi | L1 Infrastructure |
| Nguyên nhân | Một process/container khác đang dùng cùng port |
| Cách xác định | `docker compose ps`, `netstat -ano | findstr :4000` trên Windows hoặc `sudo lsof -i :4000` trên Linux |
| Cách fix | Dừng process/container đang chiếm port hoặc đổi `BACKEND_PORT`, `FRONTEND_PORT`, `MYSQL_PORT` trong `.env` |
| Phòng tránh | Chuẩn hóa port trong `.env.example`, kiểm tra port trước khi demo |

Minh chứng nên lưu:

- Ảnh lỗi bind port.
- Ảnh lệnh tìm process đang chiếm port.
- Ảnh container chạy lại thành công.

## Incident 3: CORS/ENV sai khi deploy frontend và backend khác domain

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | Frontend load được nhưng gọi API thất bại, browser console báo CORS hoặc Network error |
| Layer lỗi | L4 Frontend / L3 Backend config |
| Nguyên nhân | `CORS_ORIGIN` trong backend không khớp URL frontend production |
| Cách xác định | Mở DevTools Network, kiểm tra request API bị block; kiểm tra `CORS_ORIGIN` bằng `docker compose config` |
| Cách fix | Sửa `.env`: `CORS_ORIGIN=https://<frontend-domain>`, redeploy backend |
| Phòng tránh | Không hardcode API/CORS, ghi rõ URL deploy trong checklist, smoke test sau redeploy |

Minh chứng nên lưu:

- Ảnh console CORS error.
- Ảnh `docker compose config` trước/sau khi sửa.
- Ảnh request API thành công sau khi fix.

## Incident 4: Dependency audit báo lỗ hổng `xlsx`

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | `npm ci` backend thành công nhưng báo `1 high severity vulnerability` |
| Layer lỗi | L1 Tooling / Supply chain |
| Nguyên nhân | Package `xlsx` đang có advisory bảo mật và chưa có bản fix tự động trong nhánh đang dùng |
| Cách xác định | `npm audit --omit=dev` trong thư mục `backend` |
| Cách fix | Theo dõi bản vá package, cân nhắc thay parser Excel nếu advisory ảnh hưởng luồng production, giới hạn file upload 5MB và chỉ cho user đã đăng nhập import |
| Phòng tránh | Chạy audit định kỳ, khóa dependency bằng `package-lock.json`, hạn chế quyền import theo role |

Minh chứng nên lưu:

- Ảnh `npm audit --omit=dev`.
- Ảnh route import có `requireAuth`, `requireRole("admin", "teacher")` và giới hạn file size.

## Incident 5: Test/backend build bị treo do khởi tạo DB quá sớm

| Mục | Nội dung |
| --- | --- |
| Hiện tượng | Chạy test/build backend có thể bị treo hoặc phụ thuộc MySQL dù test không cần DB thật |
| Layer lỗi | L3 Backend |
| Nguyên nhân | MySQL pool được tạo ngay khi import module, khiến script build/test chạm vào cấu hình DB quá sớm |
| Cách xác định | Chạy `npm test` hoặc `npm run build` trong `backend`, kiểm tra stack/log liên quan `pool.js` |
| Cách fix | Lazy-init database pool: chỉ tạo pool khi có query thực sự, thêm `closePool()` để test/script đóng kết nối |
| Phòng tránh | Tách logic thuần ra khỏi kết nối hạ tầng, viết test cho service không phụ thuộc DB thật |

Minh chứng nên lưu:

- Ảnh `npm test` pass.
- Ảnh `npm run build` pass.
- Ảnh đoạn code `backend/src/db/pool.js` dùng lazy-init.

## Kịch bản demo debug

Kịch bản dễ demo nhất:

1. Đổi `BACKEND_PORT=4001` hoặc giữ port cũ bị chiếm để tạo lỗi truy cập backend.
2. Chạy `docker compose up -d --build`.
3. Kiểm tra frontend/backend lỗi.
4. Xác định layer L1 bằng `docker compose ps` hoặc lỗi bind port.
5. Sửa `.env`, chạy lại compose.
6. Chứng minh `/api/health` OK và frontend gọi API được.

Kịch bản an toàn hơn:

1. Đổi tạm `CORS_ORIGIN` sang URL sai.
2. Redeploy backend.
3. Mở frontend và DevTools Network để thấy request bị chặn.
4. Sửa lại `CORS_ORIGIN`.
5. Redeploy backend và chứng minh request API thành công.
