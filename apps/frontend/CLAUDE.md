# Frontend Specific Convention & Context (Crab Platform)

## 1. Framework & Core Libraries
- **ReactJS**: React 18+ với **Vite** bundler và **TypeScript** (`strict: true`).
- **Styling**: Tailwind CSS + Modern Glassmorphism & Micro-animations.
- **Maps & GIS**: 
  - `leaflet` + `react-leaflet` (Render bản đồ OpenStreetMap & Polyline OSRM).
  - `@turf/turf` (Nội suy mượt mà `turf.along`, `turf.length`, `turf.bearing` cho xe di chuyển real-time).
- **Real-time Gateway**: `socket.io-client` (WebSockets kết nối tới Backend Gateway `ws://localhost:3000` hoặc port cấu hình).
- **State Management**: `zustand` (Quản lý Auth, Trip Active State, Driver Telemetry).
- **HTTP Client**: `axios` với Axios Interceptors xử lý Bearer Token và chuẩn hóa Error Response.
- **Icons**: `lucide-react`.

---

## 2. Kiến trúc & Cấu trúc thư mục (`apps/frontend/src`)
```
apps/frontend/src/
├── assets/             # Icons, Sound effects (Pings, Alerts), Logo Crab
├── components/
│   ├── common/         # Button, Input, Modal, Toast, Badge, BottomSheet, Skeleton
│   ├── map/            # CrabMap, PickupDropoffMarkers, MovingVehicleMarker, RoutePolyline
│   ├── customer/       # BookingPanel, VehicleSelector, FindingRadarModal, TripBottomSheet, RatingModal
│   ├── driver/         # OnlineToggle, TripOfferModal, NavigationPanel, StateActionStepper, WalletCard
│   ├── admin/          # MetricsGrid, LiveFleetMap, WeatherSurgeToggle, UserTable, CouponTable
│   └── dev-tools/      # DevSimulatorWidget (Mô phỏng tài xế ảo, điều chỉnh tốc độ 1x/2x/5x)
├── hooks/
│   ├── useSocket.ts          # Kết nối Socket.io, tự động reconnect và dispatch event
│   ├── useGeolocation.ts     # Lấy tọa độ GPS động từ HTML5 Geolocation
│   ├── useTripTracking.ts    # Hook lắng nghe stream vị trí và cập nhật trạng thái đơn
│   └── useAuth.ts            # Quản lý phiên đăng nhập và phân quyền RBAC
├── pages/
│   ├── auth/           # LoginPage, RegisterPage (Hỗ trợ Customer & Driver)
│   ├── customer/       # CustomerHomePage, ActiveTripPage, TripHistoryPage
│   ├── driver/         # DriverDashboardPage, DriverNavigationPage, DriverWalletPage
│   └── admin/          # AdminOverviewPage, AdminFleetMapPage, AdminUsersPage, AdminCouponsPage
├── services/
│   ├── api.ts          # Axios instance và interceptors
│   ├── auth.service.ts # API login, register, profile
│   ├── trip.service.ts # API preview cước phí OSRM, book trip, cancel, rate
│   ├── driver.service.ts # API toggle online, update location, accept trip, update status
│   └── admin.service.ts  # API toggle weather surge, user management, coupons
├── stores/
│   ├── authStore.ts    # State user, token, role (CUSTOMER / DRIVER / ADMIN / SYSTEM_ADMIN)
│   ├── tripStore.ts    # State active trip, pickup, dropoff, route geometry, fare, status
│   └── driverStore.ts  # State isOnline, currentLocation, incomingOffer, walletBalance
├── types/
│   ├── api.types.ts    # Response format wrapper { statusCode, message, data, error }
│   ├── trip.types.ts   # TripStatus enum, TripDto, Coordinates, RoutePreviewDto
│   ├── user.types.ts   # UserDto, Role enum, DriverProfileDto, WalletDto
│   └── socket.types.ts # Socket Event payload interfaces
└── utils/
    ├── geo.utils.ts    # Format khoảng cách (km, m), thời gian dự kiến (phút)
    ├── turf.utils.ts   # Tính toán nội suy điểm di chuyển trung gian dọc theo polyline
    └── currency.utils.ts # Format tiền tệ Việt Nam Đồng (e.g. `25.000 ₫`)
```

---

## 3. Quy chuẩn Map & Real-time Tracking (Quan trọng)

1. **Dynamic Geolocation (Không hardcode tọa độ)**:
   - Sử dụng `navigator.geolocation.getCurrentPosition` để lấy vị trí thực tế của người dùng.
   - Nếu bị từ chối quyền định vị, fallback về tọa độ trung tâm (mặc định TP. Hồ Chí Minh `[10.776889, 106.700806]`) và cho phép click chọn trực tiếp trên bản đồ Leaflet.
2. **Nội suy di chuyển mượt mà bằng Turf.js**:
   - Khi nhận tọa độ mới qua WebSockets (`trip:location_stream`), KHÔNG nhảy giật marker tức thì.
   - Sử dụng `@turf/turf` (`turf.along`, `turf.length`) để chia nhỏ quãng đường và render di chuyển đều đặn theo tick 1.0s – 1.5s.
   - Tính toán góc quay (`heading` / `turf.bearing`) để xoay icon phương tiện theo hướng di chuyển.
3. **Quản lý Vòng đời Socket.io Room**:
   - Khi bắt đầu chuyến đi: Tự động emit `join_room` với `trip_${tripId}`.
   - Khi hoàn thành hoặc hủy chuyến: Tự động rời room và clear các timer animation.

---

## 4. Quản lý State Machine & Business Rules (Frontend Directives)

- **Trip Lifecycle State Machine**:
  - Ride-hailing: `FINDING_DRIVER` ➔ `ACCEPTED` ➔ `ARRIVED_AT_PICKUP` ➔ `IN_TRANSIT` ➔ `ARRIVED_AT_DESTINATION` ➔ `COMPLETED` (hoặc `CANCELLED`).
  - Food Delivery: `FINDING_DRIVER` ➔ `ACCEPTED` ➔ `ARRIVED_AT_RESTAURANT` ➔ `WAITING_FOR_FOOD` (10s mock) ➔ `IN_TRANSIT` ➔ `ARRIVED_AT_CUSTOMER` ➔ `COMPLETED`.
- **Ràng buộc Hủy chuyến**:
  - Khách hàng: Được hủy khi ở `FINDING_DRIVER` hoặc `ACCEPTED`. CHẶN hủy khi trạng thái đã là `IN_TRANSIT`.
  - Tài xế: Được hủy -> Trip quay lại `FINDING_DRIVER` để tìm tài xế khác.
- **Xử lý Xung đột Nhận cuốc (`409 Conflict`)**:
  - Khi tài xế bấm nhận cuốc nhưng cuốc đã có người nhận trước, Backend trả về HTTP `409`. Frontend bắt lỗi này và hiển thị Toast: *"Cuốc xe đã được tài xế khác tiếp nhận!"*, đóng modal offer và quay về màn hình chờ.
- **Ràng buộc Ví tài xế**:
  - Kiểm tra số dư ví tài xế (`MIN_WALLET_BALANCE` = 100.000 ₫). Nếu số dư không đủ, hiển thị cảnh báo đỏ và khóa nút Bật nhận cuốc (`is_online`).

---

## 5. Coding Rules cho AI Agent (Frontend)

1. **Source of Truth**: LUÔN ĐỌC `API-CONTRACT.md` ở root folder trước khi tạo Service, Hook hoặc Types.
2. **Tuân thủ Directives**: Đọc và làm theo mọi quy tắc tại `RULE.md` ở root folder.
3. **Task Tracking**: Sau khi hoàn thành bất kỳ task/sub-task nào, PHẢI cập nhật file `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md` (chuyển `[ ]` thành `[x]`).
4. **Issue Tracking**: Khi phát hiện lỗi hoặc fix xong bug, ghi nhận và cập nhật vào `apps/frontend/ISSUES-LIST-TRACKING.md` và `BUG-TRACKING.md`.
5. **Clean Code & Vietnamese Comments**: Comment giải thích logic phức tạp bằng **Tiếng Việt**, không để lại code thừa hay `console.log`.
