# Frontend Issues List & Tracking

File này được Frontend Agent và lập trình viên quản lý để theo dõi, ghi nhận và cập nhật trạng thái các bug/issue phát sinh trong giao diện, tương tác bản đồ Leaflet, WebSockets, State Machine hoặc tích hợp API.

---

## 📋 Danh sách Issue & Bug Tracking

| ID | Issue Description | Component / Page | Severity (Low/Medium/High/Critical) | Status (Open/In Progress/Resolved) | Resolution / Notes |
|:---|:---|:---|:---|:---|:---|
| FE-001 | (Sample) Leaflet map container bị vỡ kích thước khi mở lại tab hoặc đổi kích thước màn hình | `CrabMap.tsx` | Medium | Resolved | Đã thêm hook lắng nghe resize và gọi `map.invalidateSize()` khi render. |
| FE-002 | (Sample) Marker xe bị giật cục khi nhận tọa độ mới qua WebSocket | `MovingVehicleMarker.tsx` | High | Resolved | Đã tích hợp Turf.js `turf.along` với khoảng thời gian nội suy 1.2s để chuyển động mượt mà. |
| FE-003 | (Sample) Race condition nhận cuốc trả về 409 làm treo giao diện tài xế | `TripOfferModal.tsx` | High | Resolved | Đã bắt mã lỗi `409 Conflict`, hiển thị toast thông báo thân thiện và tự động đóng modal. |
| FE-004 | Nút tài khoản mẫu Customer/Driver đăng nhập bằng dữ liệu giả hoặc không tồn tại trong database | `LoginPage.tsx`, `auth.service.ts` | High | Resolved | Nút mẫu thử login trước, chỉ đăng ký qua API khi nhận 401, sau đó dùng user/token thật; không còn dựng user từ JWT. |
| FE-005 | Luồng đăng ký gửi ảnh base64 nguyên kích thước và không chuẩn hóa dữ liệu nhập | `RegisterPage.tsx`, `image.utils.ts` | High | Resolved | Nén ảnh phía frontend trước khi gửi JSON, trim/normalize email và kiểm tra mật khẩu tối thiểu 6 ký tự. |
| FE-006 | Customer/Driver hiển thị fallback giả: giá, vị trí, hồ sơ xe, trạng thái online và tự động nhận chuyến | Customer/Driver pages and stores | Critical | Resolved | Xóa mock/fallback nghiệp vụ; hiển thị loading/empty/error và chỉ cập nhật state sau API/WebSocket thành công. |
| FE-007 | Hủy chuyến chỉ reset state local, không gọi API; modal nhận cuốc gọi API trùng với dashboard | `CustomerHomePage.tsx`, `TripOfferModal.tsx` | High | Resolved | Gọi `POST /trips/:id/cancel` trước khi reset và giao quyền accept cho dashboard để tránh request duplicate. |
| FE-008 | Form/toast/icon button thiếu hỗ trợ accessibility và giảm chuyển động | Common components and auth/customer/driver UI | Medium | Resolved | Bổ sung `name`, `autocomplete`, `aria-*`, focus-visible, live region, trạng thái loading và reduced-motion. |
| FE-009 | DriverDashboard thiếu listener `driver:trip_cancelled_offer` và `trip:status_changed` khi khách hủy | `DriverDashboardPage.tsx` | High | Resolved | Đã thêm listener `driver:trip_cancelled_offer` và `trip:status_changed` để tự động đóng popup nhận cuốc và reset trạng thái khi cuốc bị hủy. |
| FE-010 | Multi-tab session dính chung dữ liệu khi test 1 Khách - Nhiều Tài xế | `authStore.ts`, `api.ts`, `socket.service.ts` | Medium | Resolved | Chuyển lưu trữ Auth sang `sessionStorage` (ưu tiên) giúp mỗi tab trình duyệt duy trì phiên đăng nhập riêng biệt. |
| FE-012 | Trắng màn hình sau khi tài xế nhận cuốc do API trả về GeoJSON Point không có lat/lng trực tiếp | `trip.service.ts`, `CrabMap.tsx`, `PickupDropoffMarkers.tsx` | Critical | Resolved | Bổ sung hàm `normalizeTrip` & `normalizeLocationPoint` chuyển đổi GeoJSON sang `{ lat, lng }` an toàn, thêm guard `isValidCoord` trong tất cả các map components. |
| FE-013 | Autocomplete Photon luôn lỗi 400 do public instance không hỗ trợ `lang=vi` | `geocoding.service.ts`, `AddressAutocomplete.tsx` | High | Resolved | Bỏ `lang` để dùng tên địa phương OSM; test URL và browser QA xác nhận trả 6 option. |
| FE-014 | Màn khách hàng tràn ngang 465px và panel che bản đồ ở viewport 375px | `Navbar.tsx`, `CustomerHomePage.tsx`, `BookingPanel.tsx` | High | Resolved | Responsive navbar, touch target 44px, bottom sheet cuộn/safe-area; xác minh 375/768/812-landscape/1440 không tràn. |
| FE-015 | Trip normalization dựng tọa độ Halo khi API thiếu endpoint | `trip.service.ts`, `tripNormalization.utils.ts` | High | Resolved | Reject dữ liệu trip/GeoJSON malformed thay vì tạo marker giả; bổ sung 3 test. |
| FE-016 | Không thể chạy lint vì frontend chưa có script/config ESLint | `package.json` | Low | Open | `npm run lint` trả `Missing script: lint`; cần tác vụ tooling riêng. TypeScript production build vẫn pass. |
| FE-017 | Chuyến đã nhận không mô phỏng được: runtime thiếu simulator và GPS tài xế phát socket thiếu Trip ID | `DriverDashboardPage.tsx`, `DriverTripSimulator.tsx`, `driverTripSimulation.utils.ts` | High | Resolved | Bổ sung controller 1x/2x/5x theo state machine và geometry OSRM, payload location có Trip ID, pause GPS thật, stop/progress UI và guard event trip cũ. Browser E2E hoàn tất cuốc và xác minh dừng/hủy; 8 test simulator cùng 2 test routing, tổng 37 test đều pass. |
| FE-018 | Lệch UI tại ô nhập điểm đón/đến (dư vạch đỏ trang trí lệch vị trí) và nút thanh toán 'Tiền mặt' bị rớt dòng | `BookingPanel.tsx` | Low | Resolved | Gỡ vạch decor cứng lệch vị trí; thêm `whitespace-nowrap` và đồng bộ `h-10` cho hàng nút phương thức thanh toán & áp dụng mã KM. Browser snapshot xác nhận UI cân bằng hoàn hảo, test & build pass. |
| FE-019 | Simulator tự phát toàn bộ trạng thái chuyến đi; đồng hồ chờ reset khi remount; offer Socket mới ghi đè offer trước nên Driver mất cuốc thứ hai | `DriverTripSimulator.tsx`, `FindingRadarModal.tsx`, `TripOfferModal.tsx`, `driverStore.ts` | High | Resolved | Simulator chỉ phát vị trí ở `ACCEPTED`/`IN_TRANSIT`; đồng hồ dùng `created_at`; queue giữ từng `tripId`, xóa có mục tiêu và clear khi accept. 45/45 test và production build pass. |
| FE-020 | API rating lỗi nhưng modal vẫn báo thành công và đóng, làm khách mất nội dung đánh giá | `RatingModal.tsx`, `ratingSubmission.utils.ts` | High | Resolved | Controller submission chỉ gọi success sau API resolve; lỗi hiển thị toast error và giữ modal để retry; có test success/failure. |
| FE-021 | Socket reconnect tạo socket id mới nhưng frontend không rejoin room chuyến active | `socket.service.ts` | High | Resolved | Lưu room distinct trong Set, replay `join_room` ở mỗi event `connect`, quên room khi chuyến hoàn tất/hủy; 3 regression test pass. |
| FE-022 | Weather UI mất trạng thái khi refresh, thiếu wallet guard/E-Wallet và route preview dựng điểm giả khi geometry lỗi | Admin/Driver/Customer services and pages | High | Resolved | Đồng bộ GET weather + request lock, guard ví 100.000 ₫, render đủ 3 payment method và reject geometry malformed; utility boundary tests pass. |
| FE-023 | Login/modal thiếu zoom, ARIA/focus/contrast; bundle entry vượt 500 kB | Common UI, `App.tsx`, auth pages | Medium | Resolved | Bỏ khóa zoom, chuẩn hóa accessible modal/input/buttons và màu Dark Green; lazy page routes giảm entry từ 581,28 kB xuống 246,54 kB; axe 0 violation. |
| FE-024 | Leaflet chỉ hiển thị route/marker trên nền xám khi môi trường local không phân giải được OpenStreetMap tile host | `CrabMap.tsx`, `OfflineMapLayer.tsx` | Medium | Resolved | Sau 2 tile error khi chưa có tile thành công, tạo canvas GridLayer cục bộ, hỗ trợ pan/zoom và hiển thị nhãn rõ ràng đây là sơ đồ offline, không phải dữ liệu đường thật. Browser local smoke xác nhận. |
| FE-025 | User mới đăng nhập/đăng ký có thể thấy active trip/driver của phiên trước, trông như vừa đặt đã được nhận cuốc | `authStore.ts`, `CustomerHomePage.tsx`, trip/driver stores | High | Resolved | Login/logout disconnect socket và reset session-bound state; hydrate `GET /trips/active = null` xóa trip stale, bỏ response component unmount. Backend chỉ accept qua endpoint Driver nên không có auto-accept tại booking. |



---

## 📌 Hướng dẫn dành cho Frontend Agent:
1. **Khi phát hiện issue mới**: Thêm ngay 1 dòng mới vào bảng trên với ID tăng dần (`FE-004`, `FE-005`,...), đặt Status là `Open`.
2. **Nếu issue ảnh hưởng đến cả Backend hoặc API Contract**: Ghi nhận đồng thời vào `BUG-TRACKING.md` tại root repo.
3. **Khi đã sửa và test xong**: Đổi Status thành `Resolved` và ghi chú tóm tắt cách xử lý vào cột `Resolution / Notes`.
