# Global Bug & Issue Tracking

Tài liệu này được sử dụng làm trung tâm kiểm soát lỗi. Mọi bug, issue, lỗ hổng hoặc các vấn đề thiết kế phát sinh trong quá trình phát triển (thuộc cả Frontend, Backend, hoặc Infrastructure) đều được Agent log (ghi nhận) tại đây.

| ID | Date | Component (FE/BE/Infra) | Description | Severity | Status (Open/In Progress/Resolved) | Resolution / Notes |
|:---|:---|:---|:---|:---|:---|:---|
| BUG-001 | 2026-08-19 | BE | Lỗ hổng Validation DTO: `BookOrderDto` thiếu `@ValidateNested()`, dẫn đến việc không chặn được tọa độ rác `lat/lng` lồng bên trong. | High | Resolved | Đã thêm `@ValidateNested` và `Type` từ `class-transformer` để siết chặt đầu vào. |
| BUG-002 | 2026-08-19 | BE/Thiết kế | Thiếu luồng API Preview: Khách hàng cần xem trước đường vẽ và cước phí *trước khi* nhấn Đặt cuốc. API `/book` gom cả việc tính giá lẫn tạo cuốc làm mất trải nghiệm UX. | Medium | Resolved | Đã tách riêng endpoint `POST /api/v1/orders/preview` gọi tới OSRM và Pricing mà không lưu database. |
| BUG-003 | 2026-08-19 | BE/Tài liệu | Thiếu Document API Driver: Các API cập nhật vị trí và bật/tắt online của Tài xế chưa được ghi chú vào `API-CONTRACT.md`. | Low | Resolved | Đã bổ sung API 2.8 và 2.9 vào Source of Truth để Frontend gọi. |
