# Backend Development Tracking Logs (Detailed Breakdown)

*(Tài liệu dành cho BE-Agent tick `[x]` khi hoàn thành từng sub-task)*

## Phase 1: Infra, Base Architecture & Auth Foundation
- [ ] **Task 1.1: Docker & Infrastructure Setup**
  - [ ] Tạo file `docker-compose.yml` chứa các container: PostgreSQL (image `postgis/postgis:15-3.3`), pgAdmin, OSRM backend (tuỳ chọn), Redis (dùng cho Socket.io pub/sub/caching).
  - [ ] Định nghĩa các biến môi trường chuẩn trong `.env.example` (DB_HOST, DB_PORT, JWT_SECRET, OSRM_URL...).
- [ ] **Task 1.2: NestJS Project Initialization & Config**
  - [ ] Generate NestJS structure (nếu setup dạng monorepo thì đặt tại `apps/backend`).
  - [ ] Cài đặt các thư viện lõi: `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`.
  - [ ] Cấu hình `ConfigModule` load biến môi trường global.
  - [ ] Cấu hình `TypeOrmModule.forRootAsync()` kết nối với DB sử dụng thông tin từ env.
- [ ] **Task 1.3: User & Auth Module (`modules/auth`)**
  - [ ] Tạo `User` Entity (TypeORM): `id` (uuid), `email` / `phone_number` (unique), `password`, `role` (enum: CUSTOMER, DRIVER, ADMIN), `created_at`.
  - [ ] Implement API `/auth/register`: Validate dữ liệu, hash password bằng `bcrypt`, lưu DB.
  - [ ] Implement API `/auth/login`: So sánh password, generate Access Token bằng `@nestjs/jwt`.
  - [ ] Tạo `JwtStrategy` và `JwtAuthGuard` để bảo vệ các private routes.
  - [ ] Tạo `@Roles()` decorator và `RolesGuard` để phân quyền (VD: API lấy danh sách tài xế chỉ Admin được gọi).

## Phase 2: Core Booking, Maps & State Machine
- [ ] **Task 2.1: Routing Module (`modules/routing`)**
  - [ ] Cài đặt `@nestjs/axios` & `axios`.
  - [ ] Tạo `RoutingService` call Http tới OSRM container (`/route/v1/driving/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson`).
  - [ ] Viết hàm parse response lấy `distance` (mét), `duration` (giây) và `coordinates` (tuyến đường).
- [ ] **Task 2.2: Pricing Service**
  - [ ] Định nghĩa Config hoặc Constants cho tính giá: Base Fare, Rate/km.
  - [ ] Viết hàm `calculateFare(distanceInMeters, serviceType, weatherSurge)` áp dụng công thức: `Base + (Dist * Rate) * Surge`.
- [ ] **Task 2.3: Order Module - Entity & Enums (`modules/orders`)**
  - [ ] Tạo bảng `Order`: `id` (uuid), `customer_id` (FK), `driver_id` (FK, nullable), `pickup_location` (Point, srid 4326), `dropoff_location` (Point, srid 4326), `status` (Enum), `total_fare` (decimal).
  - [ ] Định nghĩa `OrderStatus` Enum đúng chuẩn README: `FINDING_DRIVER`, `ACCEPTED`, `ARRIVED_AT_PICKUP`, `ARRIVED_AT_RESTAURANT`, `WAITING_FOR_FOOD`, `IN_TRANSIT`, `ARRIVED_AT_DESTINATION`, `COMPLETED`, `CANCELLED`.
- [ ] **Task 2.4: Order Module - State Machine Logic**
  - [ ] Xây dựng State Transition Guard: Viết hàm check logic không cho chuyển trạng thái nhảy cóc (VD: cấm từ `ACCEPTED` nhảy thẳng lên `COMPLETED`).
- [ ] **Task 2.5: Order API (Booking)**
  - [ ] Viết POST `/api/v1/orders/book`: Nhận Toạ độ -> Gọi Routing Service tính route -> Gọi Pricing Service tính giá -> Lưu DB trạng thái `FINDING_DRIVER`.
  - [ ] Cài đặt `@nestjs/event-emitter`, emit sự kiện `order.created` sau khi insert DB thành công.

## Phase 3: Spatial Dispatch & Matching Logic
- [ ] **Task 3.1: Driver Location Management (`modules/drivers`)**
  - [ ] Tạo bảng `DriverLocation` kết nối 1-1 với `User` (role DRIVER).
  - [ ] Thiết kế cột `current_location`: Kiểu `geometry(Point, 4326)`. BẮT BUỘC đánh index `GiST`.
  - [ ] Thêm cột theo dõi trạng thái cuốc: `is_online` (boolean), `active_order_id` (uuid, nullable).
  - [ ] API toggle bật/tắt nhận cuốc cho tài xế.
- [ ] **Task 3.2: Matching Algorithm (Thuật toán không gian)**
  - [ ] Viết hàm Custom Repository sử dụng TypeORM QueryBuilder.
  - [ ] Sử dụng PostGIS function `ST_DWithin` và `ST_Distance` để tìm tài xế.
  - [ ] Điều kiện WHERE: `is_online = true`, `active_order_id IS NULL`, khoảng cách <= 3000m. ORDER BY distance ASC LIMIT 5.
- [ ] **Task 3.3: Dispatch Flow (Event Listener)**
  - [ ] Bắt sự kiện `order.created`.
  - [ ] Gọi hàm Matching lấy danh sách 5 tài xế gần nhất.
  - [ ] Bắn tín hiệu socket `driver:order_offer` tới các tài xế tìm được.
- [ ] **Task 3.4: Accept Order API (Xử lý Race Condition)**
  - [ ] Viết POST `/api/v1/orders/:orderId/accept`.
  - [ ] Áp dụng Database Transaction (`Pessimistic Lock - SELECT FOR UPDATE` hoặc `Optimistic Lock`) để tránh tình trạng 2 tài xế cùng ấn nhận 1 đơn.
  - [ ] Update `Order` sang `ACCEPTED`. Update `DriverLocation.active_order_id`.

## Phase 4: Realtime Gateway & Simulation (Hardest Part)
- [ ] **Task 4.1: Socket.io Gateway Setup (`modules/tracking`)**
  - [ ] Cài đặt `@nestjs/websockets`, `@nestjs/platform-socket.io`.
  - [ ] Khởi tạo `TrackingGateway`. Viết logic xác thực JWT ngay trong hàm `handleConnection` của Socket.
  - [ ] Viết logic Join Room theo ID Đơn hàng: `client.join("order_" + orderId)`.
- [ ] **Task 4.2: Telemetry Pinging & Broadcasting**
  - [ ] `@SubscribeMessage('driver:update_location')`: Bắt sự kiện tài xế gửi tọa độ.
  - [ ] *[Tối ưu hóa]*: Không UPDATE thẳng vào Postgres mỗi giây. Bỏ tọa độ vào mảng Memory hoặc Redis. Viết 1 `CronJob` mỗi 10 giây gom tọa độ flush xuống DB 1 lần.
  - [ ] Emit trực tiếp qua socket `order:location_stream` về room `order_<id>` cho Customer xem marker di chuyển realtime.
  - [ ] Broadcast sự kiện `order:status_changed` khi State Machine chuyển đổi.
- [ ] **Task 4.3: Driver Simulator Script (`modules/simulator`)**
  - [ ] Cài đặt package `@turf/turf` để xử lý GeoJSON nội suy.
  - [ ] Xây dựng POST `/api/v1/simulator/simulate-trip`.
  - [ ] Lấy geometry (Polyline) của tuyến đường từ OSRM. 
  - [ ] Sử dụng `setInterval`, dùng `turf.length` và `turf.along` để tính ra điểm tọa độ mới (tiến lên phía trước) mỗi 1.5 giây.
  - [ ] Xử lý ngắt interval: Khi trạng thái `ARRIVED_AT_RESTAURANT`, clear interval, đợi `setTimeout` 10s giả lập quán làm đồ ăn, sau đó đổi trạng thái sang `IN_TRANSIT` và tiếp tục interval chạy đến đích.

## Phase 5: Refactoring, Validation & Error Handling
- [ ] **Task 5.1: Global Exception Filter & Interceptor**
  - [ ] Tạo `HttpExceptionFilter` custom để map mọi error trả về chuẩn chung của `API-CONTRACT.md` (statusCode, message, error).
  - [ ] Tạo `TransformInterceptor` bọc kết quả response thành object có properties `data`, `statusCode`, `message`.
- [ ] **Task 5.2: Validation Pipes**
  - [ ] Enable `ValidationPipe` global. Cài `class-validator`, `class-transformer`.
  - [ ] Viết đầy đủ DTO cho mọi API endpoint. Chặn whitelist các field dư thừa.
