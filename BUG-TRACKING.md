# Global Bug & Issue Tracking

Tài liệu này được sử dụng làm trung tâm kiểm soát lỗi. Mọi bug, issue, lỗ hổng hoặc các vấn đề thiết kế phát sinh trong quá trình phát triển (thuộc cả Frontend, Backend, hoặc Infrastructure) đều được Agent log (ghi nhận) tại đây.

| ID | Date | Component (FE/BE/Infra) | Description | Severity | Status (Open/In Progress/Resolved) | Resolution / Notes |
|:---|:---|:---|:---|:---|:---|:---|
| BUG-001 | 2026-08-19 | BE | Lỗ hổng Validation DTO: `BookOrderDto` thiếu `@ValidateNested()`, dẫn đến việc không chặn được tọa độ rác `lat/lng` lồng bên trong. | High | Resolved | Đã thêm `@ValidateNested` và `Type` từ `class-transformer` để siết chặt đầu vào. |
| BUG-002 | 2026-08-19 | BE/Thiết kế | Thiếu luồng API Preview: Khách hàng cần xem trước đường vẽ và cước phí *trước khi* nhấn Đặt cuốc. API `/book` gom cả việc tính giá lẫn tạo cuốc làm mất trải nghiệm UX. | Medium | Resolved | Đã tách riêng endpoint `POST /api/v1/orders/preview` gọi tới OSRM và Pricing mà không lưu database. |
| BUG-003 | 2026-08-19 | BE/Tài liệu | Thiếu Document API Driver: Các API cập nhật vị trí và bật/tắt online của Tài xế chưa được ghi chú vào `API-CONTRACT.md`. | Low | Resolved | Đã bổ sung API 2.8 và 2.9 vào Source of Truth để Frontend gọi. |
| BUG-004 | 2026-08-19 | BE/Real-time | Cronjob hủy đơn tự động không phát Socket: Frontend bị kẹt mãi mãi ở trạng thái `FINDING_DRIVER` khi Backend đã hủy đơn vì timeout. | High | Resolved | Đã thêm logic bắn `order:status_changed` tới `trackingGateway` trong file `orders.service.ts` khi cronjob hủy cuốc. |
| BUG-005 | 2026-08-19 | Infra/Dev | Xung đột cổng Port 3000 giữa Frontend Vite và Backend NestJS: File `.env` ban đầu để Backend `PORT=3000` trùng với Vite dev server `port: 3000`, dẫn đến Vite Proxy trả về lỗi 500 `ECONNREFUSED`. | High | Resolved | Đã tách cổng chuẩn: Backend chạy cổng `PORT=4000` và Frontend Vite chạy cổng `PORT=3000` (Proxy `/api` về 4000). Toàn bộ Auth/DB đã hoạt động 100%. |
