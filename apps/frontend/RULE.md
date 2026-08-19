# RULE.md - Quy tắc phát triển Frontend & UI/UX Directives (Crab Platform)

Tài liệu này định nghĩa các nguyên tắc **bắt buộc và tối thượng** khi AI Agent hoặc lập trình viên thực hiện bất kỳ công việc thiết kế UI, phát triển tính năng, tích hợp bản đồ GIS, Socket.io real-time hoặc refactor trong thư mục `apps/frontend/` của dự án **Crab — Transport & Food Delivery Platform**.

---

## 🌟 1. BA NGUYÊN LÝ NỀN TẢNG (CORE PRINCIPLES)

Mọi thay đổi trong mã nguồn Frontend phải tuân thủ nghiêm ngặt 3 nguyên lý:

1. **Tối giản & Tái sử dụng (Minimalist & Reusable)**: Thiết kế component mô-đun hóa, nguyên tử (Atomic Component Architecture). Phân tách rõ ràng giữa Map Presentation, State Machine Controllers, Socket Listeners và Business Hooks. Không lặp lại logic tính khoảng cách hay format tiền tệ.
2. **Kháng lỗi & Chuẩn State Machine (Real-time Resilience & State Machine Integrity)**: 
   - Xử lý triệt để 100% các trạng thái UI: `Finding Driver (Radar Pulse)`, `Accepted`, `Arrived at Pickup/Restaurant`, `Waiting for Food`, `In Transit`, `Arrived at Customer/Destination`, `Completed`, `Cancelled`.
   - Bắt lỗi API chuẩn theo hợp đồng [API-CONTRACT.md](./API-CONTRACT.md).
   - Xử lý mượt mà xung đột nhận cuốc (`409 Conflict - Race Condition`), mất kết nối WebSockets (Auto-reconnect), và lỗi cấp quyền định vị GPS.
3. **Trải nghiệm Đỉnh cao phong cách Grab/Uber (High Aesthetic & Responsive UX)**:
   - Giao diện hiện đại, sắc nét lấy cảm hứng trực tiếp từ **Grab (Bike, Car, Food)**.
   - Marker xe di chuyển mượt mà trên bản đồ bằng **Turf.js along-path interpolation** (1.0s – 1.5s interval), không giật cục.
   - Responsive hoàn hảo từ Mobile (360px) đến Desktop (1920px+).

---

## 📋 2. QUY TRÌNH PHÁT TRIỂN 6 BƯỚC (BẮT BUỘC)

Không bỏ qua bất kỳ bước nào dưới đây. Nếu phát hiện thiếu thông tin hoặc sai lệch thiết kế, phải làm rõ trước khi tiếp tục:

1. **Lập kế hoạch Task & UI Component Breakdown**: Phân tích Yêu cầu -> Vẽ cấu trúc Component & Route (Customer / Driver / Admin) -> Xác định State (Zustand / Context / React Query).
2. **Đối soát Hợp đồng API & Socket Events**: Đọc kỹ [API-CONTRACT.md](./API-CONTRACT.md) để xác định đúng Endpoint, Query Params, Request Body, DTO Response và Socket.io Event names (`trip:location_stream`, `trip:status_changed`, `driver:trip_offer`).
3. **Thực thi UI, Map Engine & Real-time Socket**: Xây dựng UI chuẩn phong cách Crab với Leaflet.js, OSRM Polyline, Turf.js marker animation, Socket.io client.
4. **Xử lý Edge Cases, Không Hardcode Tọa độ & Comment Tiếng Việt**:
   - Sử dụng tọa độ thực tế từ HTML5 Geolocation hoặc User click chọn trên bản đồ. Tuyệt đối KHÔNG hardcode tọa độ giả lập cố định (No Halo coords).
   - Viết comment giải thích logic phức tạp (State transition guard, Turf along calculation, Socket room management).
   - Dọn sạch `console.log` thừa và dead code.
5. **Đánh dấu Trạng thái & Bằng chứng Hoàn thành**: Cập nhật dấu `[x]` kèm thông tin kiểm thử vào [DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md](./apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md).
6. **Theo dõi Bug & Bài học Kinh nghiệm**: Ghi nhận bất kỳ lỗi nảy sinh (Marker jitter, Socket reconnection, Tile layer leak, Responsive break) vào [ISSUES-LIST-TRACKING.md](./apps/frontend/ISSUES-LIST-TRACKING.md) và [BUG-TRACKING.md](./BUG-TRACKING.md).

---

## 🚨 3. NGUỒN DỮ LIỆU CHUẨN (SOURCE OF TRUTH)

Trước khi viết bất kỳ dòng code nào, BẮT BUỘC phải đọc và tuân thủ các tài liệu sau:

1. 📄 **[API-CONTRACT.md](./API-CONTRACT.md)**
   * Hợp đồng giao tiếp giữa Frontend và Backend.
   * Tất cả Payload REST API và Socket.io Events phải khớp **100%**.
   * Đơn vị tiền tệ hiển thị: **VND (Việt Nam Đồng)** dạng format chuẩn (ví dụ: `25.000 ₫`).
   * 🚨 **QUY TẮC BẮT BUỘC**: Nếu Frontend cần thêm field hoặc chỉnh sửa endpoint, BẮT BUỘC phải cập nhật [API-CONTRACT.md](./API-CONTRACT.md) trước hoặc đồng thời.

2. 📄 **[PROJECT-DETAIL.md](./PROJECT-DETAIL.md)**
   * Nắm rõ luồng nghiệp vụ:
     * **Booking Engine & Dynamic Fare**: `Total Fare = Base Fare + (Distance * Rate) * Surge Multiplier (Rain/Peak) - Coupon Discount`.
     * **Trip State Machine**: Vòng đời đơn nghiêm ngặt: `FINDING_DRIVER` -> `ACCEPTED` -> `ARRIVED_AT_PICKUP` -> `IN_TRANSIT` -> `ARRIVED_AT_DESTINATION` -> `COMPLETED`.
     * **Pessimistic Locking / Concurrency**: Xử lý tình huống nhiều tài xế cùng bấm nhận cuốc -> người đến sau nhận lỗi `409 Conflict`.
     * **Driver Rules & Constraints**: Tài xế phải `is_online = true`, không có `active_trip_id`, ví tài xế có số dư >= `MIN_WALLET_BALANCE` (100k).
     * **Cancellation Rules**: Khách chỉ được hủy khi ở `FINDING_DRIVER` hoặc `ACCEPTED`. Chặn hủy khi đã `IN_TRANSIT`.

3. 📄 **[CLAUDE.md](./apps/frontend/CLAUDE.md) (Frontend)**
   * Nắm rõ Tech Stack: React 18, Vite, TypeScript, Tailwind CSS, Leaflet.js, OpenStreetMap, Turf.js, Socket.io-client, Lucide Icons, Zustand.
   * Quy chuẩn cấu trúc thư mục, quy ước đặt tên component, custom hooks và state management.

4. 📄 **[README.md](./README.md)**
   * Nắm tổng quan kiến trúc toàn hệ thống: Backend NestJS + PostGIS, Frontend ReactJS, OSRM Routing, Driver Simulation.

---

## 🛑 4. QUY TẮC THAO TÁC TỐI THƯỢNG (SUPREME RULES FOR FRONTEND)

1. **Phạm vi thư mục tuyệt đối**:
   * Chỉ thao tác và tạo code trong thư mục **`apps/frontend/`** (hoặc `frontend/`).
   * Tuyệt đối KHÔNG tự ý sửa code logic trong thư mục `apps/backend/` trừ khi cần đồng bộ hợp đồng API tại root.

2. **Tiêu chuẩn UI/UX Đẳng cấp Grab**:
   * **Bản đồ tương tác (Interactive Leaflet Map)**:
     - Load tile OpenStreetMap mượt mà, hỗ trợ zoom, pan, click để chọn điểm đi (Pickup) / điểm đến (Dropoff).
     - Hiển thị marker điểm đón (Xanh lá), điểm đến (Đỏ/Cam), vị trí tài xế (Icon xe xoay theo hướng di chuyển `heading`).
     - Vẽ Polyline tuyến đường thực tế OSRM (Màu xanh thương hiệu Crab `#00B14F` hoặc xanh dương `#007AFF`).
   * **Màn hình Tìm tài xế (Finding Driver Screen)**:
     - Hiệu ứng sóng radar lan tỏa (Pulsing Radar Wave) quanh vị trí khách hàng.
     - Đồng hồ đếm thời gian tìm kiếm kèm nút "Hủy tìm kiếm".
   * **Bảng điều khiển Hành trình (Trip Bottom Sheet / Floating Card)**:
     - Floating Card nổi trên bản đồ hiển thị thông tin tài xế (Tên, Ảnh đại diện, Biển số xe, Loại xe, Điểm đánh giá ⭐).
     - Thanh tiến trình State Machine trực quan (Stepper: Tìm xe -> Đã nhận -> Đang đến -> Đang chở -> Hoàn thành).
     - Nút gọi điện / nhắn tin giả lập và nút Hủy chuyến (nếu hợp lệ).
   * **Màn hình Tài xế (Driver Portal)**:
     - Công tắc chuyển trạng thái Bật/Tắt nhận cuốc (Go Online / Offline Toggle) nổi bật.
     - Modal Nhận cuốc mới (Incoming Trip Offer) với thanh đếm ngược 15 giây, hiển thị khoảng cách đón, điểm đến, doanh thu dự kiến và 2 nút Nhận / Từ chối.
     - Bảng điều hướng thao tác: Nút bấm cập nhật trạng thái theo từng bước (Đã đến điểm đón -> Bắt đầu chở -> Đã đến nơi -> Hoàn thành).
   * **Widget Trình giả lập (Dev Driver Simulator Controller)**:
     - Floating control widget cho phép Dev/Tester kích hoạt mô phỏng di chuyển (`simulate-trip`), điều chỉnh tốc độ (1x, 2x, 5x) và theo dõi telemetry.
   * **Portal Quản trị (Admin Dashboard)**:
     - Thống kê tổng quan (GMV, Tổng cuốc, Tài xế đang Online).
     - Bản đồ giám sát toàn bộ tài xế và chuyến xe đang hoạt động (Fleet Live Map).
     - Công tắc Bật/Tắt Chế độ Mưa / Thời tiết cực đoan (Surge Pricing +50%).
     - Quản lý danh sách Khách hàng & Tài xế (Khóa/Mở tài khoản, duyệt xe).

3. **Quy tắc Bản đồ & Định vị (GIS & Geolocation)**:
   - **Tọa độ Động**: Lấy vị trí ban đầu qua HTML5 `navigator.geolocation.getCurrentPosition`. Nếu người dùng từ chối quyền, fallback về trung tâm thành phố mặc định (ví dụ: TP. Hồ Chí Minh `[10.776889, 106.700806]`) và cho phép click chọn trực tiếp trên bản đồ.
   - **Smooth Interpolation**: Sử dụng `@turf/turf` (`turf.along`, `turf.length`, `turf.bearing`) để tính toán vị trí di chuyển trung gian mượt mà giữa các tọa độ GPS do Socket bắn về (tick 1.0s – 1.5s).

4. **Xử lý Bất đồng bộ & Phản hồi Người dùng (UX Resilience)**:
   - Tất cả button submit đều phải có trạng thái `Disabled` + `Spinner loading` khi đang gọi API.
   - Dùng Skeleton Loading thay vì màn hình trắng.
   - Toast notification hiển thị thông báo thành công / thất bại rõ ràng với mã lỗi thân thiện.
   - Bắt lỗi `409 Conflict` khi tài xế nhận trễ cuốc: "Cuốc xe đã được tài xế khác tiếp nhận!".

5. **Comment bằng Tiếng Việt & Clean Code**:
   - Viết comment bằng **Tiếng Việt** giải thích lý do xử lý logic UI/State/Socket phức tạp.
   - Tuyệt đối không lưu code bị comment-out, dead code, `console.log` thừa.

---

## 🎨 5. QUY CHUẨN THIẾT KẾ & BẢNG MÀU (CRAB BRAND PALETTE)

| Thành phần | Mã màu Hex | Ý nghĩa & Ứng dụng |
|---|---|---|
| **Crab Primary Green** | `#00B14F` | Màu thương hiệu chính, Primary Buttons, Active States, Điểm đón (Pickup Pin) |
| **Crab Dark Green** | `#00843D` | Hover Buttons, Header Background, Text nhấn mạnh |
| **Crab Light Green** | `#E8F8EE` | Badge nền, Selected card background, Icon accents |
| **Crab Food Orange** | `#FF5B00` | CrabFood service theme, Khuyến mãi, Flash deals |
| **Accent Amber / Yellow** | `#FFB800` | Rating Stars (⭐), Warning badges, Chờ món ăn (Waiting for Food) |
| **Map Route Blue** | `#007AFF` | Đường dẫn OSRM Polyline dẫn đường trên bản đồ |
| **Danger Red** | `#EF4444` | Nút Hủy chuyến, Điểm trả khách (Dropoff Pin), Lỗi thanh toán |
| **Dark Slate / Text** | `#111827` | Tiêu đề, Text chính (Heading & Body text) |
| **Muted Slate** | `#6B7280` | Text phụ, Mô tả địa chỉ, Timestamp |
| **Background Neutral** | `#F8FAFC` | Nền trang chính, Nền Card kết quả tìm kiếm |
| **Pure White** | `#FFFFFF` | Nền Card, Floating Bottom Sheet, Modal |

---

## 🧪 6. BẰNG CHỨNG HOÀN THÀNH TASK (EVIDENCE OF DONE)

Một task Frontend chỉ được coi là hoàn thành khi đáp ứng đủ các tiêu chí:

1. **Build & Type Check Clean**: Chạy `npm run build` và `npm run lint` không phát sinh lỗi TypeScript hoặc ESLint.
2. **Responsive Check**: Đã kiểm tra hiển thị mượt mà trên Mobile (375px), Tablet (768px), và Desktop (1440px+).
3. **Map & Real-time Verification**: Bản đồ Leaflet load mượt, vẽ đúng Polyline OSRM, marker di chuyển mượt khi nhận Socket event hoặc Simulator.
4. **API Integration Test**: Kết nối API thành công với Backend hoặc trả về dữ liệu Mock khớp 100% schema `API-CONTRACT.md`.
5. **Cập nhật Logs**: Đánh dấu `[x]` trong [DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md](./apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md) và ghi nhận vấn đề nảy sinh vào [ISSUES-LIST-TRACKING.md](./apps/frontend/ISSUES-LIST-TRACKING.md).

---

## 🐞 7. QUY TRÌNH QUẢN LÝ THAY ĐỔI & BÁO LỖI (BUG TRACKING RULE)

Khi có bất kỳ thay đổi, sự cố hoặc phát hiện lỗi (bug) nảy sinh trong quá trình phát triển và tích hợp:

1. **Ghi nhận thông tin vào [BUG-TRACKING.md](./BUG-TRACKING.md)**:
   * Ngay khi phát hiện bug hoặc có thay đổi phát sinh giữa FE và BE, BẮT BUỘC phải ghi nhận ngay một dòng mới vào bảng `DANH SÁCH BUG` tại file [BUG-TRACKING.md](./BUG-TRACKING.md).
   * Ghi rõ: `ID`, `Date`, `Component (FE/BE/Infra)`, `Description`, `Severity (CRITICAL / HIGH / MEDIUM / LOW)`, `Status`, `Resolution / Notes`.

2. **Phân loại & Quy trình Xử lý**:
   * **Lỗi thuộc về Backend (BE)**: Ghi chi tiết thông tin lỗi, Endpoint/Payload, Response mã lỗi và log vào [BUG-TRACKING.md](./BUG-TRACKING.md) để Backend Agent xử lý.
   * **Lỗi thuộc về Frontend (FE)**:
     * Frontend Agent ghi vào [ISSUES-LIST-TRACKING.md](./apps/frontend/ISSUES-LIST-TRACKING.md) và [BUG-TRACKING.md](./BUG-TRACKING.md).
     * Trực tiếp kiểm tra, tìm nguyên nhân và thực hiện sửa lỗi.
     * Chạy kiểm thử xác minh (`npm run type-check`, `npm run lint`, `npm run build`).
     * Khi xử lý xong và test thành công, tiến hành **ĐÁNH DẤU TICK `[x]`** vào ô Status trong [BUG-TRACKING.md](./BUG-TRACKING.md) và chuyển status sang `Resolved` trong [ISSUES-LIST-TRACKING.md](./apps/frontend/ISSUES-LIST-TRACKING.md).
