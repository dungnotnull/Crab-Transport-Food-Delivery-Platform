# Backend Development Tracking Logs (Detailed Breakdown)

*(Tài liệu dành cho BE-Agent tick `[x]` khi hoàn thành từng sub-task)*

## Phase 1: Infra, Base Architecture & Auth Foundation
- [ ] **Task 1.1: Docker & Infrastructure Setup**
  - [ ] Tạo file `docker-compose.yml` (PostgreSQL `postgis/postgis:15-3.3`, pgAdmin, OSRM backend, Redis).
  - [ ] Định nghĩa các biến môi trường chuẩn trong `.env.example`.
- [ ] **Task 1.2: NestJS Project Initialization & Config**
  - [ ] Generate NestJS structure (đặt tại `apps/backend`).
  - [ ] Cài đặt các thư viện lõi (`@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`).
  - [ ] Cấu hình `ConfigModule` và `TypeOrmModule` global.
- [ ] **Task 1.3: User & Auth Module (`modules/auth`)**
  - [ ] Tạo `User` Entity (TypeORM): `id`, `email`, `password`, `role` (enum: `SYSTEM_ADMIN`, `ADMIN`, `CUSTOMER`, `DRIVER`).
  - [ ] Viết Database Seeder: Chạy lúc khởi tạo để tạo sẵn 1 account `SYSTEM_ADMIN` duy nhất (root admin).
  - [ ] Implement API `/auth/register`: CHỈ cho phép tạo role `CUSTOMER` hoặc `DRIVER`. Validate dữ liệu, hash password.
  - [ ] Implement API `/auth/login`: So sánh password, generate Access Token.
  - [ ] Tạo `JwtStrategy` và `JwtAuthGuard` để bảo vệ routes.
- [ ] **Task 1.4: System Admin & Management API (`modules/users`)**
  - [ ] Implement CRUD API cho `SYSTEM_ADMIN` để tạo/xóa các account `ADMIN` phụ hoặc vô hiệu hóa người dùng.
  - [ ] Cài đặt decorator `@Roles(Role.SYSTEM_ADMIN)` để phân quyền khắt khe.

## Phase 2: Core Booking, Maps & State Machine
- [ ] **Task 2.1: Routing Module (`modules/routing`)**
  - [ ] Cài đặt `@nestjs/axios` & `axios`.
  - [ ] Tạo `RoutingService` call Http tới OSRM container lấy `distance`, `duration` và `coordinates` (tuyến đường).
- [ ] **Task 2.2: Pricing Service**
  - [ ] Viết hàm `calculateFare(distanceInMeters, serviceType)` (Công thức: `Base + (Dist * Rate) * Surge`).
- [ ] **Task 2.3: Order Module - Entity & Enums (`modules/orders`)**
  - [ ] Tạo bảng `Order`: `id`, `customer_id`, `driver_id`, `pickup_location`, `dropoff_location`, `status`, `total_fare`.
  - [ ] Enum `OrderStatus`: `FINDING_DRIVER`, `ACCEPTED`, `ARRIVED_AT_PICKUP`, `ARRIVED_AT_RESTAURANT`, `WAITING_FOR_FOOD`, `IN_TRANSIT`, `ARRIVED_AT_DESTINATION`, `COMPLETED`, `CANCELLED`.
- [ ] **Task 2.4: Order Module - State Machine Logic**
  - [ ] Xây dựng State Transition Guard: Hàm check logic cấm chuyển trạng thái nhảy cóc.
- [ ] **Task 2.5: Order API (Booking) & Geospatial Constraint**
  - [ ] API POST `/api/v1/orders/book`: Nhận toạ độ -> Gọi Routing -> Gọi Pricing.
  - [ ] **Ràng buộc địa lý**: Thêm logic báo lỗi `400 Bad Request` nếu `distance > 50km` (50,000m).
  - [ ] Lưu DB trạng thái `FINDING_DRIVER`. Emit sự kiện `order.created`.
- [ ] **Task 2.6: Timeout/Auto-Cancel Cronjob (`modules/cron`)**
  - [ ] Viết `CronJob` (chạy mỗi 1 phút): Quét các Order có `status = FINDING_DRIVER` và `created_at` quá 5 phút. Tự động đổi sang `CANCELLED`.

## Phase 3: Spatial Dispatch, Matching & Cancellation Rules
- [ ] **Task 3.1: Driver Location Management (`modules/drivers`)**
  - [ ] Tạo bảng `DriverLocation` nối 1-1 với `User` (DRIVER).
  - [ ] Cột `current_location` (Kiểu `Point`, srid `4326`, index `GiST`). Cột `is_online`, `active_order_id`.
  - [ ] API bật/tắt nhận cuốc (`is_online`).
- [ ] **Task 3.2: Matching Algorithm (Thuật toán)**
  - [ ] QueryBuilder kết hợp hàm PostGIS `ST_DWithin` và `ST_Distance`.
  - [ ] **Ràng buộc tài xế**: Bắt buộc WHERE `is_online = true` VÀ `active_order_id IS NULL`. Khoảng cách <= 3000m. LIMIT 5.
- [ ] **Task 3.3: Dispatch Flow (Event Listener)**
  - [ ] Bắt sự kiện `order.created`, gọi hàm Matching tìm top 5.
  - [ ] Phát socket `driver:order_offer` tới 5 tài xế, đính kèm `expiredAt` (15s TTL).
- [ ] **Task 3.4: Accept Order API (Pessimistic Locking)**
  - [ ] API POST `/api/v1/orders/:orderId/accept`.
  - [ ] **Race Condition Check**: Mở `Transaction`. BẮT BUỘC dùng `SELECT FOR UPDATE` (Pessimistic Lock) khi query lấy đơn hàng. Nếu `status` không còn là `FINDING_DRIVER`, rollback và báo lỗi `409 Conflict`.
  - [ ] Cập nhật Order sang `ACCEPTED`, cập nhật `DriverLocation.active_order_id`.
- [ ] **Task 3.5: Cancellation Flow (Quy tắc hủy)**
  - [ ] API POST `/api/v1/orders/:orderId/cancel`. Lấy role từ JWT. 
  - [ ] **Customer**: Chặn lỗi `400` nếu status là `IN_TRANSIT` hoặc `WAITING_FOR_FOOD`. Nếu hủy hợp lệ, đổi Order sang `CANCELLED` và giải phóng Driver (`active_order_id = NULL`).
  - [ ] **Driver**: Được phép hủy. Giải phóng Driver (`active_order_id = NULL`). Bắt buộc reset Order quay lại `FINDING_DRIVER` và emit lại luồng Matching tìm người khác.

## Phase 4: Realtime Gateway & Simulation (Hardest Part)
- [ ] **Task 4.1: Socket.io Gateway Setup (`modules/tracking`)**
  - [ ] Tạo `TrackingGateway`. Xác thực JWT trong hàm `handleConnection`.
  - [ ] Logic Join Room: `client.join("order_" + orderId)`.
- [ ] **Task 4.2: Telemetry Pinging & Broadcasting**
  - [ ] Bắt event `driver:update_location`.
  - [ ] Dùng `CronJob` gom buffer tọa độ update DB mỗi 10s để giảm tải.
  - [ ] Emit `order:location_stream` (Customer xem live marker).
- [ ] **Task 4.3: Driver Simulator Script (`modules/simulator`)**
  - [ ] Cài đặt `@turf/turf`. API POST `/api/v1/simulator/simulate-trip`.
  - [ ] Dùng `setInterval`, `turf.length`, `turf.along` chạy mô phỏng tick 1.5s. Giả lập pause 10s tại nhà hàng.

## Phase 5: Refactoring, Validation & Error Handling
- [ ] **Task 5.1: Global Exception Filter & Interceptor**
  - [ ] Bọc error format chung theo `API-CONTRACT.md`.
- [ ] **Task 5.2: Validation Pipes**
  - [ ] Cài `class-validator`, kiểm tra DTO chặt chẽ.
