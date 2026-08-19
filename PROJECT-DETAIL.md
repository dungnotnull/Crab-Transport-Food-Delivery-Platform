# Project Detail: Crab Platform

## Tech Stack
- **Backend**: NestJS (TypeScript), Clean Architecture / DDD
- **Frontend**: ReactJS (Vite, TailwindCSS)
- **Database**: PostgreSQL + PostGIS (Sử dụng TypeORM để mapping dữ liệu Geometry dễ dàng)
- **Real-time**: Socket.io
- **Maps & Routing**: Leaflet.js (UI Map), OSRM (Backend calculation path/distance)
- **Interpolation**: Turf.js (`turf.along`, `turf.length`) để mượt mà marker movement.
- **Infrastructure**: Docker, Docker Compose

## Project Structure
Dự án được tổ chức như sau:
```
crab/
├── apps/
│   ├── backend/   # NestJS API & Gateway (Chứa các modules: auth, trips, drivers, tracking, routing, simulator)
│   └── frontend/  # React SPA
└── osrm/          # OSRM routing data (tuỳ chọn self-host)
```

## Core Features
1. **User Role Management**:
   - **System Admin**: Tài khoản Master/Root duy nhất của hệ thống (có thể được sinh ra bằng Seeder). Có toàn quyền CRUD tất cả các roles khác (bao gồm cả việc tự tạo ra các Admin phụ).
   - **Admin**: Tài khoản quản lý nghiệp vụ, được tạo bởi System Admin.
   - **Customer & Driver**: Tài khoản người dùng cuối, tự động được tạo thông qua API đăng ký (`/auth/register`).
2. **Booking Engine**: Dynamic fare calculation: `Total Fare = Base Fare + (Distance * Rate) * Surge Multiplier`.
3. **State Machine**: Vòng đời đơn hàng rất nghiêm ngặt: `FINDING_DRIVER` -> `ACCEPTED` -> `ARRIVED_AT_PICKUP` -> `IN_TRANSIT` -> `ARRIVED_AT_DESTINATION` -> `COMPLETED`.
4. **Matching Algorithm**: PostGIS spatial indexing (`ST_DWithin`). Bán kính tìm kiếm 3km (3000m) lọc tài xế `is_online = true` và `active_trip_id IS NULL`.
5. **Live Tracking & Simulator**: Socket.io + worker giả lập di chuyển.

## Business Rules & Constraints
Để đảm bảo hệ thống hoạt động chuẩn Enterprise và thực tế như Grab, các quy tắc và ràng buộc (Constraints) sau bắt buộc phải được áp dụng:

1. **Ràng buộc Nhận cuốc (Concurrency / Race Condition)**:
   - Một đơn hàng chỉ có thể được nhận bởi MỘT tài xế duy nhất. Khi thuật toán Broadcast phát cuốc cho top 5 tài xế, nếu nhiều người cùng bấm nhận 1 lúc, Backend phải dùng **Pessimistic Locking** (`SELECT FOR UPDATE`) để khóa dòng dữ liệu của Trip đó lại. Ai đến trước được trước, người đến sau nhận lỗi `409 Conflict`.
2. **Ràng buộc Tài xế (Driver Constraints)**:
   - **Trạng thái**: Tài xế bắt buộc phải `is_online = true` mới lọt vào thuật toán Matching.
   - **Số lượng cuốc**: Tài xế không thể nhận thêm đơn mới nếu trường `active_trip_id` khác NULL (đang bận 1 cuốc xe khác).
3. **Quy tắc Hủy chuyến (Cancellation Rules)**:
   - **Khách hàng**: Được hủy khi đơn ở trạng thái `FINDING_DRIVER` hoặc `ACCEPTED`. Bị CẤM hủy khi đã tới bước `IN_TRANSIT`.
   - **Tài xế**: Nếu tài xế hủy (do xe hỏng, ko liên lạc được khách), `active_trip_id` của tài xế về NULL, và Trip sẽ được tự động đổi lại thành `FINDING_DRIVER` để hệ thống tìm tài xế thay thế.
4. **Quy tắc Quá hạn (Timeout/TTL Constraints)**:
   - **Auto-Cancel**: Nếu đơn hàng ở trạng thái `FINDING_DRIVER` quá 5-10 phút mà không có ai nhận, một Cronjob hệ thống sẽ tự động quét và chuyển trạng thái sang `CANCELLED`.
5. **Ràng buộc Địa lý (Geospatial Rules)**:
   - **Max Distance**: Hệ thống từ chối tính giá/tạo đơn nếu khoảng cách (Distance) OSRM trả về > 50km.
