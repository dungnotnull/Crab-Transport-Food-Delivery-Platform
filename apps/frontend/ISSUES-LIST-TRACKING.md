# Frontend Issues List & Tracking

File này được Frontend Agent và lập trình viên quản lý để theo dõi, ghi nhận và cập nhật trạng thái các bug/issue phát sinh trong giao diện, tương tác bản đồ Leaflet, WebSockets, State Machine hoặc tích hợp API.

---

## 📋 Danh sách Issue & Bug Tracking

| ID | Issue Description | Component / Page | Severity (Low/Medium/High/Critical) | Status (Open/In Progress/Resolved) | Resolution / Notes |
|:---|:---|:---|:---|:---|:---|
| FE-001 | (Sample) Leaflet map container bị vỡ kích thước khi mở lại tab hoặc đổi kích thước màn hình | `CrabMap.tsx` | Medium | Resolved | Đã thêm hook lắng nghe resize và gọi `map.invalidateSize()` khi render. |
| FE-002 | (Sample) Marker xe bị giật cục khi nhận tọa độ mới qua WebSocket | `MovingVehicleMarker.tsx` | High | Resolved | Đã tích hợp Turf.js `turf.along` với khoảng thời gian nội suy 1.2s để chuyển động mượt mà. |
| FE-003 | (Sample) Race condition nhận cuốc trả về 409 làm treo giao diện tài xế | `TripOfferModal.tsx` | High | Resolved | Đã bắt mã lỗi `409 Conflict`, hiển thị toast thông báo thân thiện và tự động đóng modal. |

---

## 📌 Hướng dẫn dành cho Frontend Agent:
1. **Khi phát hiện issue mới**: Thêm ngay 1 dòng mới vào bảng trên với ID tăng dần (`FE-004`, `FE-005`,...), đặt Status là `Open`.
2. **Nếu issue ảnh hưởng đến cả Backend hoặc API Contract**: Ghi nhận đồng thời vào `BUG-TRACKING.md` tại root repo.
3. **Khi đã sửa và test xong**: Đổi Status thành `Resolved` và ghi chú tóm tắt cách xử lý vào cột `Resolution / Notes`.
