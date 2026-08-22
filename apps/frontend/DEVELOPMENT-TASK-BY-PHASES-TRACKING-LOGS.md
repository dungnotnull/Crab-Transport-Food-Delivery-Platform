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

## 🤖 Phase 7: Driver Simulator Controller (Dev/Test Tool) - [SUPERSEDED]

- Bản `DevSimulatorWidget` lịch sử đã bị gỡ khỏi app runtime; API backend tương ứng hiện chưa đáng tin cậy (`BUG-016`, `BUG-024`).
- Controller frontend-only thay thế và bằng chứng kiểm thử được theo dõi chính xác tại **Phase 13**.

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

---

## 🚕 Phase 12: Grab-like Address Search & Nearby Fleet Simulation - [COMPLETED]

- [x] **Task 12.1: Điểm đón / Điểm đến động**
  - Hai combobox độc lập; chỉ lưu tọa độ sau khi chọn option, GPS hoặc click/drag trên map.
  - Không còn default/fallback nghiệp vụ Halo; GeoJSON lỗi bị reject thay vì dựng marker giả.
- [x] **Task 12.2: Address autocomplete**
  - Photon/OSM search-as-you-type, debounce 350ms, abort stale request, cache query và giới hạn bbox Việt Nam.
  - Hỗ trợ ArrowUp/ArrowDown/Enter/Escape cùng `combobox`/`listbox`/`option` ARIA đầy đủ.
  - Browser QA thực tế: query “Cho Ben Thanh” trả 6 gợi ý; chọn pickup/dropoff thành công bằng bàn phím.
- [x] **Task 12.3: Mô phỏng nhiều tài xế quanh pickup**
  - 6 tài xế BIKE/CAR_4/CAR_7 được sinh tương đối theo pickup, gồm tài xế trong và ngoài bán kính 3 km.
  - Chỉ tài xế vừa đúng loại xe vừa trong `<= 3 km` được đánh dấu đủ điều kiện; quyền accept thật vẫn thuộc backend.
  - Marker nội suy 1.1s bằng `requestAnimationFrame`, xoay heading và tắt chuyển động khi `prefers-reduced-motion`.
- [x] **Task 12.4: Concurrency & Cancellation**
  - Single-flight guard chặn double-click nhận cuốc; HTTP 409 đóng offer, lỗi khác giữ offer để retry.
  - Customer cancel dùng allow-list `FINDING_DRIVER`/`ACCEPTED`, có loading và chặn request lặp.
- [x] **Task 12.5: Mobile-first QA**
  - Booking panel thành bottom sheet tối đa 68%, chừa bản đồ/fleet; navbar không còn gây horizontal overflow.
  - Pass 375×812, 768×1024, 1440×900, 812×375 landscape và chữ lớn 20px.
  - Bằng chứng ảnh/report: `apps/frontend/dogfood-output/report.md`.
- [x] **Verification**
  - `npm test`: 27/27 pass, gồm race accept, cancellation, geocoding, fleet eligibility/movement và trip normalization.
  - `npm run build`: pass TypeScript + Vite production build; còn warning chunk >500 kB.
  - `npm run lint`: chưa chạy được vì package thiếu script; theo dõi tại `FE-016` / `BUG-022`.
  - Backend read-only regression: 13/14 suite fail baseline; ghi `BUG-016`–`BUG-018` và `REQ-BE-001`, không sửa `apps/backend/`.

---

## 🛵 Phase 13: Assigned Driver Trip Simulation Recovery - [COMPLETED]

- [x] **Task 13.1: Driver-side simulation controller**
  - Controller chỉ xuất hiện trong portal DRIVER sau khi đã nhận cuốc; hỗ trợ 1x/2x/5x, tiến độ, dừng và tiếp tục từ trạng thái hiện tại.
  - Luồng trạng thái đúng backend: `ACCEPTED → ARRIVED_AT_PICKUP → IN_TRANSIT → ARRIVED_AT_DESTINATION → COMPLETED`.
- [x] **Task 13.2: Real-time location contract**
  - Mọi `driver:update_location` của chuyến active đều có `tripId`; màn khách nhận `trip:location_stream` và dùng marker chuyển động hiện có.
  - GPS thật được tạm dừng trong lúc chạy simulator để hai nguồn tọa độ không làm marker nhảy qua lại.
- [x] **Task 13.3: Route and stale-event resilience**
  - Chặng pickup → dropoff lấy geometry OSRM và dùng Turf để lấy mẫu dọc tuyến; fallback tuyến thẳng chỉ khi preview lỗi.
  - Status socket được đối chiếu với active Trip ID ở cả Customer/Driver trước khi thay đổi state; response fetch cũ không được ghi đè chuyến mới.
- [x] **Task 13.4: Verification**
  - `npm test`: 37/37 pass, gồm 8 regression test simulator và 2 test routing cho payload Trip ID, state machine, resume, OSRM geometry, speed, stop, GPS guard, stale-event guard và response OSRM lỗi.
  - `npm run build`: pass TypeScript + Vite production build; còn warning chunk >500 kB.
  - Browser E2E thật trên customer + driver: nhận cuốc, tải/vẽ tuyến OSRM, chạy 5x, marker khách di chuyển, đến điểm đón/điểm trả và hoàn tất chuyến; chạy lại để xác minh dừng mô phỏng rồi customer hủy thì cả hai portal cùng reset, không có page error.
  - `npm run lint`: chưa có script, tiếp tục theo dõi tại `FE-016` / `BUG-022`.
  - Không sửa backend; các lỗi backend phát hiện thêm được ghi tại `BUG-024` và `BUG-025`.

---

## 🚦 Phase 14: Driver Offer Queue & Manual Trip Simulation - [COMPLETED]

- [x] **Task 14.1: Chỉ mô phỏng hai chặng xe di chuyển**
  - Simulator chỉ phát `driver:update_location` khi trip là `ACCEPTED` (đến đón khách) hoặc `IN_TRANSIT` (bắt đầu đi).
  - Các status `ARRIVED_AT_PICKUP`, `IN_TRANSIT`, `ARRIVED_AT_DESTINATION`, `COMPLETED` chỉ thay đổi bằng nút thao tác thủ công của Driver; kết thúc mô phỏng không reset active trip.
- [x] **Task 14.2: Đồng hồ chờ độc lập cho Customer**
  - Modal tìm tài xế tính thời gian từ `activeTrip.created_at`, nên reload/remount không đưa đồng hồ về 0 và hai trip đồng thời có thời gian riêng.
- [x] **Task 14.3: Hiển thị nhiều trip offer cho Driver**
  - Offer Socket được xếp hàng theo `tripId`; Driver xem toàn bộ offer Backend broadcast trong phạm vi 3 km.
  - Từ chối, TTL hết hạn, hủy hoặc 409 chỉ xóa offer tương ứng; accept thành công xóa các offer còn lại vì Driver đã bận.
- [x] **Verification**
  - `npm.cmd test`: 45/45 pass, gồm regression cho simulator, hai đồng hồ User và hàng đợi hai offer cùng điểm đón.
  - `npm.cmd run build`: pass TypeScript + Vite production build; còn cảnh báo chunk JavaScript 580.76 kB (>500 kB).
  - Smoke test backend local: với cùng route `CAR_4`, cước khô 36.000 ₫ và cước mưa 54.000 ₫ (1,5×; +18.000 ₫); endpoint weather xác nhận bật mưa thành công, sau test đã tắt lại.

---

## 🛡️ Phase 15: Phase 1–9 Reliability, Accessibility & Bundle Hardening - [COMPLETED]

- [x] **Task 15.1: API và realtime resilience**
  - Rating chỉ đóng modal/báo thành công sau khi Backend lưu review; lỗi giữ nguyên form để retry.
  - Socket ghi nhớ room active, tự phát lại `join_room` sau reconnect và quên room của chuyến đã kết thúc.
  - Admin tải trạng thái thời tiết thực từ Backend; toggle có loading lock và dùng trạng thái Backend xác nhận.
- [x] **Task 15.2: Driver và Customer business guards**
  - Chặn tài xế bật online khi ví chưa tải hoặc dưới 100.000 ₫; vẫn luôn cho phép tài xế đang online tắt nhận cuốc.
  - Booking hiển thị đủ `CASH`, `CREDIT_CARD`, `E_WALLET`; geometry malformed bị reject thay vì dựng route qua pickup giả.
  - Nhóm request preview giá cũ được hủy khi tọa độ/coupon đổi hoặc màn hình unmount; request id tiếp tục chặn response stale ghi state.
- [x] **Task 15.3: Accessibility và performance**
  - Bỏ khóa zoom, sửa ARIA feedback, modal focus trap/return focus, touch target, focus-visible, reduced-motion và contrast nút xanh.
  - Lazy-load toàn bộ page route; entry JavaScript giảm từ 581,28 kB xuống 246,54 kB và không còn warning chunk >500 kB.
- [x] **Verification**
  - `npm.cmd test`: 58/58 pass, giữ nguyên regression simulator chỉ di chuyển ở `ACCEPTED`/`IN_TRANSIT` và không tự đổi status.
  - `npm.cmd run build`: pass TypeScript + Vite production build, tạo chunk riêng cho Login/Register/Customer/Driver/Admin.
  - Browser smoke: `/customer`, `/driver`, `/admin` chưa đăng nhập đều redirect `/login`; không có page error.
  - Axe WCAG A/AA trên `/login`: 0 violation; chỉ còn nhóm contrast `incomplete` cần manual review do nền glass/gradient.

---

## 🗺️ Phase 16: Offline Map Fallback & Session Isolation - [COMPLETED]

- [x] **Task 16.1: Leaflet fallback không cần Internet**
  - OSM vẫn là tile provider ưu tiên. Sau hai tile error liên tiếp mà chưa có tile tải thành công, `OfflineMapLayer` tạo canvas tile cục bộ, hỗ trợ pan/zoom cùng Leaflet.
  - UI thông báo rõ đây là sơ đồ offline, không đại diện dữ liệu đường hay địa danh thật; route, marker và bán kính matching tiếp tục nằm trên fallback layer.
- [x] **Task 16.2: Cô lập state theo phiên đăng nhập**
  - Login/logout ngắt socket cũ, xóa trip, vị trí, offer và active driver state trước khi kết nối bằng token mới.
  - Customer chỉ hydrate đúng response `GET /trips/active`; response `null` xóa state stale, response của component đã unmount bị bỏ qua.
  - Đã xác nhận theo source/backend: booking tạo `FINDING_DRIVER`; frontend chỉ gọi accept từ thao tác Driver. Hiện tượng User vừa đăng ký/đăng nhập thấy cuốc đang đi là state của phiên trước, không phải auto-accept mới.
- [x] **Verification**
  - `npm.cmd test`: 64/64 pass, gồm tile-error fallback, deferred Leaflet tile ready, active-trip null hydration và session reset ordering.
  - `npm.cmd run build`: pass TypeScript + Vite production build; main entry 248,41 kB.
  - Browser local smoke với OSM DNS không phân giải: `Bản đồ offline` hiển thị canvas sơ đồ cục bộ; User giả lập có `activeTrip: null` thấy BookingPanel, không thấy TripBottomSheet cũ.
