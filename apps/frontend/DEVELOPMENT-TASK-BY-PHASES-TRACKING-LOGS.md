# Frontend Development Tracking Logs (Detailed Breakdown)

*(Tài liệu dành cho FE-Agent tick `[x]` khi hoàn thành từng sub-task trong `apps/frontend`)*

---

## 🎯 PRIORITY MILESTONE: CORE USER FLOW & ROLE FOUNDATION (Ưu tiên số 1)
> **Mục tiêu cốt lõi**: Hoàn thiện luồng xác thực 3 Role (`CUSTOMER`, `DRIVER`, `ADMIN`), Đăng ký tài xế đầy đủ thông tin xe + hình ảnh, Khách hàng đặt xe với điểm đón tại **Halo Building** + điểm đến, và Admin xem bảng thống kê tinh gọn.

---

## 📱 Phase 1: Base Setup, Design System & Auth 3 Roles (Customer, Driver, Admin) - [COMPLETED]
- [x] **Task 1.1: Frontend Project Initialization & Tooling**
  - [x] Khởi tạo dự án ReactJS với Vite + TypeScript trong thư mục `apps/frontend`.
  - [x] Cài đặt các thư viện lõi: `tailwindcss`, `lucide-react`, `axios`, `socket.io-client`, `leaflet`, `react-leaflet`, `@turf/turf`, `zustand`, `clsx`, `tailwind-merge`.
  - [x] Cấu hình `tsconfig.json` (alias `@/*`), `vite.config.ts` và thiết lập proxy API/Socket về Backend (`localhost:4000` / `localhost:3000`).
- [x] **Task 1.2: Crab Brand Design System & UI Tokens**
  - [x] Thiết lập bảng màu chuẩn Grab: Primary Green (`#00B14F`), Dark Green (`#00843D`), Food Orange (`#FF5B00`), Amber (`#FFB800`), Slate (`#111827`, `#6B7280`).
  - [x] Xây dựng bộ UI Atoms cơ bản: `Button`, `Input`, `Card`, `Badge`, `Modal`, `BottomSheet`, `Toast`, `SkeletonLoader`.
  - [x] Tạo các hiệu ứng CSS: Pulsing Radar Wave, Shimmer Loading, Smooth Map Transition.
- [x] **Task 1.3: Core Layouts & Role-Based Navigation**
  - [x] Layout Responsive: Navbar với Logo Crab, Quick Role Switcher (`CUSTOMER` / `DRIVER` / `ADMIN`), User Profile Menu.
  - [x] Cấu hình Router (React Router DOM v6): `/login`, `/register`, `/customer`, `/driver`, `/admin`.
- [x] **Task 1.4: API Client & WebSocket Infrastructure**
  - [x] Xây dựng `axiosInstance` với Interceptor tự động gắn Bearer Token và chuẩn hóa Response/Error theo `API-CONTRACT.md`.
  - [x] Tạo `SocketService` / Hook `useSocket` quản lý kết nối Socket.io với Token JWT, xử lý Auto-reconnect và Event Dispatcher.
- [x] **Task 1.5: Authentication & Authorization 3 Roles (`/login` & `/register`)**
  - [x] **Màn hình Đăng nhập (`/login`)**:
    - [x] Form Email & Mật khẩu, hỗ trợ đăng nhập cho cả 3 Roles: `CUSTOMER`, `DRIVER`, `ADMIN`.
    - [x] Tự động điều hướng theo Role sau khi đăng nhập (Customer -> `/customer`, Driver -> `/driver`, Admin -> `/admin`).
    - [x] Lưu Access Token và User State vào LocalStorage + Zustand `authStore`.
  - [x] **Màn hình Đăng ký Khách hàng (`/register?role=CUSTOMER`)**:
    - [x] Họ tên, Email, Số điện thoại, Mật khẩu, Ảnh đại diện (`avatar_url`).
  - [x] **Màn hình Đăng ký Tài xế chi tiết (`/register?role=DRIVER`)**:
    - [x] **Thông tin cá nhân**: Họ tên, Email, SĐT, Mật khẩu, Ảnh chân dung đại diện (`avatar_url`).
    - [x] **Thông tin phương tiện**:
      - [x] Biển số xe (`license_plate`, ví dụ: `59P1-88888`).
      - [x] Loại phương tiện (`vehicle_type`: `BIKE` - Xe máy hoặc `CAR` - Ô tô).
      - [x] Hiệu xe / Dòng xe (`vehicle_brand`, ví dụ: `Honda Wave Alpha`, `Honda Vision`, `Toyota Vios`).
      - [x] Màu sắc xe (`color`, ví dụ: `Xanh lá`, `Đỏ`, `Trắng`).
      - [x] Hình ảnh phương tiện (`vehicle_image` - xem trước ảnh chụp xe).
  - [x] **Phân quyền Route (`ProtectedRoute`)**: Chặn truy cập trái phép nếu không đúng Role.

---

## 🗺️ Phase 2: Leaflet Map Engine & Customer Ride Booking (Điểm đón Halo Building) - [COMPLETED]
- [x] **Task 2.1: Leaflet Map Core Component**
  - [x] Xây dựng component `CrabMap`: Render bản đồ OpenStreetMap, tùy biến tile layer, zoom controls và attribution.
  - [x] Tích hợp Dynamic Geolocation: Lấy vị trí thực tế của người dùng qua HTML5 `navigator.geolocation.getCurrentPosition`. Fallback về tọa độ trung tâm nếu user từ chối.
  - [x] Quản lý Lifecycle bản đồ: Cleanup instance khi component unmount tránh memory leak.
- [x] **Task 2.2: Coordinate Picking & Preset Điểm đón Halo Building**
  - [x] **Tọa độ Mặc định / Quick Preset Halo Building**:
    - [x] Nút chọn nhanh 1-chạm: **"📍 Tòa nhà Halo Building (Quận 1, TP.HCM)"** (`lat: 10.782800, lng: 106.695800`).
    - [x] Nút chọn nhanh: **"📍 Vị trí GPS hiện tại của tôi"**.
  - [x] **Chọn Điểm đến (Dropoff)**:
    - [x] Click trực tiếp trên bản đồ Leaflet hoặc chọn các địa điểm gợi ý (Chợ Bến Thành, Landmark 81, Bitexco, Sân bay Tân Sơn Nhất).
    - [x] Marker Điểm đón (Pickup Pin - Xanh lá `#00B14F`) và Điểm đến (Dropoff Pin - Đỏ `#EF4444`).
- [x] **Task 2.3: OSRM Route Preview Integration**
  - [x] Gọi API `POST /api/v1/trips/preview` với Pickup (Halo Building) + Dropoff.
  - [x] Nhận `distance`, `duration`, `geometry` (GeoJSON coordinates) từ Backend.
  - [x] Vẽ Polyline tuyến đường thực tế OSRM trên bản đồ (Màu xanh `#007AFF` hoặc `#00B14F`).
  - [x] Tự động căn chỉnh khung hình (`map.fitBounds`) bao trọn toàn bộ lộ trình.
- [x] **Task 2.4: Dynamic Fare Estimation UI**
  - [x] Card chọn loại dịch vụ:
    - 🛵 **CrabBike** (Xe ôm công nghệ)
    - 🚗 **CrabCar** (Ô tô 4-7 chỗ)
    - 🍔 **CrabFood** (Giao đồ ăn nhanh)
  - [x] Hiển thị cước phí dự tính chi tiết: Giá cơ bản + Giá theo km + Hệ số thời tiết (nếu có mưa) - Giảm giá Coupon.
  - [x] Cảnh báo từ chối đặt cuốc nếu khoảng cách OSRM > 50km.
- [x] **Task 2.5: Booking & Payment Selection**
  - [x] Selector Phương thức thanh toán: `CASH` (Tiền mặt), `CREDIT_CARD` (Thẻ tín dụng), `E_WALLET` (Ví điện tử).
  - [x] Ô nhập Coupon Code (Kiểm tra và áp dụng giảm giá trước khi đặt).
  - [x] Nút **"Đặt xe ngay"** gọi API `POST /api/v1/trips/book` -> Chuyển sang Màn hình Tìm tài xế (`FINDING_DRIVER`).

---

## 📡 Phase 3: Spatial Driver Matching, Radar Pulse & Dispatch UI - [COMPLETED]
- [x] **Task 3.1: Finding Driver Screen (Customer)**
  - [x] Giao diện trạng thái `FINDING_DRIVER`: Vòng tròn Radar quét xung quanh điểm đón Halo Building (Pulsing Radar Animation).
  - [x] Hiển thị thông báo tìm tài xế gần nhất trong bán kính 3km.
  - [x] Đồng hồ đếm thời gian tìm kiếm kèm nút "Hủy tìm kiếm" (`POST /api/v1/trips/:id/cancel`).
- [x] **Task 3.2: Driver Online/Offline Telemetry Panel (Driver)**
  - [x] Switch Bật/Tắt Trực tuyến (`is_online`) gọi API `PATCH /api/v1/drivers/status`.
  - [x] Tự động phát vị trí ban đầu của tài xế lên Backend qua `PATCH /api/v1/drivers/location`.
  - [x] Hiển thị trạng thái Sẵn sàng nhận cuốc (Radar Pulse xanh trên bản đồ tài xế).
- [x] **Task 3.3: Incoming Trip Offer Modal (Driver)**
  - [x] Lắng nghe Socket event `driver:trip_offer` từ Backend.
  - [x] Popup nổ cuốc toàn màn hình / Modal nổi bật:
    - Bản đồ xem trước điểm đón (Halo Building) và điểm trả.
    - Khoảng cách đến điểm đón, quãng đường di chuyển và Doanh thu nhận được (`fare`).
    - Thanh đếm ngược 15 giây (Progress bar countdown TTL).
    - 2 Nút thao tác: "Nhận cuốc" (`accept`) và "Từ chối" (`decline`).
- [x] **Task 3.4: Concurrency & Race Condition Handling**
  - [x] Xử lý khi bấm nhận cuốc: Gọi `POST /api/v1/trips/:id/accept`.
  - [x] Nếu nhận mã lỗi `409 Conflict` (Tài xế khác đã nhận trước): Hiển thị Toast cảnh báo thân thiện "Cuốc xe đã được tài xế khác tiếp nhận!" và đóng modal, trở về trạng thái chờ cuốc mới.

---

## 🛰️ Phase 4: Real-time Live Tracking & Smooth Marker Animation - [COMPLETED]
- [x] **Task 4.1: Socket.io Room Lifecycle Management**
  - [x] Khi đơn chuyển sang `ACCEPTED`: Tự động emit `join_room` với `trip_${tripId}`.
  - [x] Rời room khi chuyến đi kết thúc hoặc bị hủy.
  - [x] Quản lý trạng thái kết nối WebSockets (Badge: Đã kết nối / Đang kết nối lại).
- [x] **Task 4.2: Telemetry Stream Consumer**
  - [x] Lắng nghe event `trip:location_stream` (Customer nhận tọa độ tài xế `{ lat, lng, heading }`).
  - [x] Lắng nghe event `driver:update_location` (Driver phát tọa độ thực hoặc tọa độ từ Simulator).
- [x] **Task 4.3: Smooth Marker Interpolation Engine (Turf.js)**
  - [x] Xây dựng Moving Vehicle Marker sử dụng `@turf/turf` (`turf.along`, `turf.length`, `turf.bearing`).
  - [x] Nội suy tọa độ mượt mà theo từng tick (1.0s – 1.5s interval), triệt tiêu hiện tượng giật cục của GPS.
  - [x] Tự động xoay icon xe (Heading rotation) theo góc hướng di chuyển thực tế.
- [x] **Task 4.4: Dynamic Route & Map Bounds Adjustment**
  - [x] Vẽ lại đường đi từ Vị trí hiện tại của Tài xế -> Điểm đón -> Điểm trả.
  - [x] Tự động tính toán và cập nhật Thời gian dự kiến đến nơi (ETA) và Khoảng cách còn lại theo thời gian thực.

---

## 🔄 Phase 5: Trip State Machine Lifecycle & Driver Workflow - [COMPLETED]
- [x] **Task 5.1: Customer Live Trip Floating Bottom Sheet**
  - [x] Floating Bottom Sheet hiển thị thông tin tài xế: Avatar, Tên, Biển số xe, Loại xe, Hiệu xe, Rating ⭐.
  - [x] Stepper trực quan hiển thị các bước State Machine:
    - `FINDING_DRIVER` ➔ `ACCEPTED` ➔ `ARRIVED_AT_PICKUP` ➔ `IN_TRANSIT` ➔ `ARRIVED_AT_DESTINATION` ➔ `COMPLETED`.
  - [x] Nút Hủy chuyến: Chỉ cho phép bấm khi ở `FINDING_DRIVER` hoặc `ACCEPTED`. Chặn và disable khi trạng thái đã là `IN_TRANSIT`.
- [x] **Task 5.2: Food Delivery State Machine Support**
  - [x] Hỗ trợ các bước đặc thù của CrabFood:
    - `FINDING_DRIVER` ➔ `ACCEPTED` ➔ `ARRIVED_AT_RESTAURANT` ➔ `WAITING_FOR_FOOD` (Đếm ngược 10s quán làm món) ➔ `IN_TRANSIT` ➔ `ARRIVED_AT_CUSTOMER` ➔ `COMPLETED`.
  - [x] Hiệu ứng animation hiển thị "Tài xế đang đợi lấy món tại nhà hàng...".
- [x] **Task 5.3: Driver Navigation & State Action Controls**
  - [x] Bảng điều khiển tài xế với các nút hành động theo từng chặng (`PATCH /api/v1/trips/:id/status`):
    - Đã đến điểm đón / quán ăn (`ARRIVED_AT_PICKUP` / `ARRIVED_AT_RESTAURANT`)
    - Bắt đầu chở khách / Đã lấy món (`IN_TRANSIT`)
    - Đã đến điểm trả / nhà khách (`ARRIVED_AT_DESTINATION` / `ARRIVED_AT_CUSTOMER`)
    - Hoàn thành chuyến xe (`COMPLETED`)
  - [x] Nút Hủy chuyến cho Tài xế (kèm hộp thoại chọn lý do hủy).
- [x] **Task 5.4: SLA Timeout & Cancellation Notifications**
  - [x] Lắng nghe event `trip:status_changed`.
  - [x] Hiển thị thông báo khi cuốc xe bị hủy bởi Cronjob hệ thống (quá hạn tìm tài xế hoặc tài xế không di chuyển).

---

## ⭐ Phase 6: Trip Completion, Rating & Feedback Flow - [COMPLETED]
- [x] **Task 6.1: Trip Receipt & Settlement Modal**
  - [x] Màn hình Hóa đơn chuyến đi (Trip Summary Receipt):
    - Tổng tiền thanh toán (`total_fare`), Chi tiết quãng đường (km), Thời gian đi (phút).
    - Phương thức thanh toán (Tiền mặt / Thẻ / Ví) và Trạng thái thanh toán (`PAID`).
    - Khuyến mãi đã áp dụng.
- [x] **Task 6.2: Customer Rating & Review Modal**
  - [x] Popup đánh giá sau khi hoàn thành chuyến:
    - Đánh giá số sao (1 đến 5 sao interactive rating).
    - Quick Feedback Tags ("Tài xế thân thiện", "Lái xe an toàn", "Xe sạch sẽ", "Đúng giờ").
    - Ô nhập nhận xét chi tiết.
  - [x] Gọi API `POST /api/v1/trips/:id/rating`.
- [x] **Task 6.3: Driver Rating Reflection**
  - [x] Cập nhật điểm đánh giá trung bình (`average_rating`) trên Profile và Header của Tài xế.

---

## 🤖 Phase 7: Driver Simulator Controller (Dev/Test Tool) - [COMPLETED]
- [x] **Task 7.1: Floating Dev Simulator Panel**
  - [x] Widget nổi (`DevSimulatorWidget`) hiển thị góc dưới màn hình, hỗ trợ thu gọn/mở rộng.
  - [x] Hiển thị Trip ID hiện tại, trạng thái chuyến đi và tốc độ mô phỏng (1x, 2x, 5x).
- [x] **Task 7.2: Simulator API Integration**
  - [x] Gọi API `POST /api/v1/simulator/simulate-trip` với `tripId` và `speedMultiplier` (1x, 2x, 5x).
  - [x] Nút Kích hoạt Mô phỏng di chuyển tài xế ảo, tự động chạy theo OSRM Polyline và cập nhật tọa độ trực quan trên bản đồ.
- [x] **Task 7.3: Dev Telemetry Live Log**
  - [x] Hiển thị tọa độ real-time, heading và trạng thái chuyến đi giúp dễ dàng test demo.

---

## 💰 Phase 8: Driver Wallet, Commission & Economy - [COMPLETED]
- [x] **Task 8.1: Driver Wallet Screen**
  - [x] Hiển thị số dư hiện tại của Ví tài xế (`walletBalance`).
  - [x] Điều kiện nhận cuốc (&ge;100.000 ₫) hiển thị trực tiếp trên thẻ ví.
- [x] **Task 8.2: Driver Wallet Guard & Blocking Warning**
  - [x] Kiểm tra số dư tối thiểu (`MIN_WALLET_BALANCE` = 100.000 ₫).
  - [x] Cảnh báo nếu ví tài xế dưới mức tối thiểu.

---

## 👑 Phase 9: Admin Lightweight Stats & Fleet Management - [COMPLETED]
- [x] **Task 9.1: Admin Simple Metrics Cards**
  - [x] Thẻ thống kê tinh gọn: Tổng số cuốc xe hôm nay, Tổng doanh thu ước tính (GMV), Số tài xế đang online, Khách hoạt động.
- [x] **Task 9.2: Customer Management Table**
  - [x] Bảng danh sách Khách hàng (`GET /api/v1/users/customers`): ID, Tên, Email, Số điện thoại, Trạng thái hoạt động.
  - [x] Nút Khóa / Mở khóa tài khoản (`PATCH /api/v1/users/:id/toggle-active`).
- [x] **Task 9.3: Driver Management Table**
  - [x] Bảng danh sách Tài xế (`GET /api/v1/users/drivers`): Tên, SĐT, Biển số xe, Hiệu xe, Loại xe (Bike/Car), Ảnh đại diện/xe, Điểm đánh giá ⭐ (`average_rating`), Trạng thái trực tuyến.
- [x] **Task 9.4: Weather Surge Pricing Toggle**
  - [x] Switch Bật/Tắt Chế độ Mưa bão / Thời tiết cực đoan (`POST /api/v1/pricing/weather`) để kích hoạt phụ phí surge +50%.

---

## 🚀 Phase 10: Polish, Performance & Mobile Responsiveness - [COMPLETED]
- [x] **Task 10.1: Mobile PWA & Touch Experience**
  - [x] Tối ưu Bottom Sheet trượt mượt mà trên thiết bị di động (Touch gestures / Drag handle).
  - [x] Thiết lập Viewport và Fullscreen Map trên Mobile browsers.
- [x] **Task 10.2: Map Tile Performance & Leak Prevention**
  - [x] Tối ưu tile caching, ngăn chặn re-render map không cần thiết.
  - [x] Tự động giải phóng Leaflet instance tránh memory leak.
- [x] **Task 10.3: End-to-End Validation & Acceptance Testing**
  - [x] Kiểm thử luồng trọn vẹn: Đặt xe từ Halo Building -> Xem trước OSRM -> Nổ cuốc tài xế -> Race condition 409 -> Di chuyển Turf.js -> Hoàn thành -> Đánh giá 5 sao.
  - [x] Kiểm tra toàn bộ mã lỗi REST API và WebSocket Disconnect recovery.

---

## 🛠️ Phase 11: Frontend Bug Fixes & UX Hardening - [COMPLETED]
- [x] Sửa luồng sample Customer/Driver bằng API register/login thật, không tự dựng dữ liệu người dùng từ JWT.
- [x] Sửa register: chuẩn hóa dữ liệu nhập, giới hạn mật khẩu và tối ưu ảnh trước khi gửi JSON.
- [x] Loại bỏ fallback nghiệp vụ giả ở Customer/Driver; chỉ dùng dữ liệu API/WebSocket hoặc trạng thái loading/empty/error.
- [x] Sửa hủy chuyến và nhận chuyến để không chỉ reset local state hoặc gọi API trùng.
- [x] Tối ưu UX/accessibility cho form, toast, focus state, mobile controls và reduced-motion.
- [x] Đã chạy regression test, TypeScript check và production build thành công.
