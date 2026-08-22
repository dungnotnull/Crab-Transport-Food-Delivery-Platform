# Phase 1–9 Frontend Hardening Design

## Mục tiêu

Khắc phục các lỗi đã xác nhận trong luồng Phase 1–9 mà không thay đổi backend, không đổi state machine chuyến đi và không ảnh hưởng các regression test đang pass. Phạm vi chỉ nằm trong `apps/frontend`.

## Phương án đã chọn

Áp dụng phương án cân bằng và cô lập:

- Mỗi quy tắc nghiệp vụ mới được đặt trong utility nhỏ, thuần TypeScript và có unit test.
- Component chỉ điều phối API, state và hiển thị; không nhân bản rule ví, rating hoặc payment method.
- Socket service lưu room đã join và phát lại `join_room` sau reconnect, tận dụng cơ chế reconnect mặc định của Socket.IO.
- Admin đọc trạng thái thời tiết từ endpoint `GET /api/v1/pricing/weather` đang có trong backend, nhưng không thay đổi backend hoặc contract root trong task frontend này.
- Route page được lazy-load để tách Leaflet/Turf và dashboard khỏi bundle đăng nhập.
- Preview giá dùng `AbortController` để hủy nhóm request cũ khi tọa độ/coupon đổi hoặc component unmount; request id vẫn là lớp bảo vệ cuối trước khi ghi state.
- Accessibility được sửa tại component dùng chung để mọi màn hình cùng hưởng lợi.

Phương án đại refactor store/socket và bổ sung framework test DOM mới bị loại vì tăng phạm vi, tăng dependency và có nguy cơ ảnh hưởng luồng đang ổn định. Phương án chỉ vá UI tại từng trang cũng bị loại vì dễ lặp rule và khó regression-test.

## Thiết kế theo nhóm

### 1. Rating không báo thành công giả

Tạo controller thuần `submitTripRating` nhận dependency `rateTrip`, callback thành công và callback lỗi. Controller chỉ gọi success sau khi API resolve; lỗi được chuyển sang callback lỗi và modal được giữ mở để người dùng retry.

### 2. Socket reconnect giữ room

`SocketService` được export để kiểm thử với socket factory giả. Service giữ `Set<string>` room đã join. Mỗi event `connect` phát lại toàn bộ room; join lặp không tạo room trùng. Listener nghiệp vụ hiện có vẫn được đăng ký và cleanup như cũ.

### 3. Weather state nhất quán

`adminService.getWeatherStatus()` chuẩn hóa payload `isExtremeWeather`. `AdminOverviewPage` tải weather song song với stats/users, nhưng lỗi weather không làm hỏng dashboard. Nút toggle có `aria-busy`, disabled trong request và dùng functional state update an toàn.

### 4. Wallet guard

Định nghĩa `MIN_DRIVER_WALLET_BALANCE = 100_000` và helper `canDriverGoOnline`. Tài xế đang offline chỉ bật online khi ví đã tải và đủ ngưỡng. Tài xế đang online luôn được phép tắt online. UI hiển thị cảnh báo/điều kiện rõ ràng.

### 5. Payment và route payload

Danh sách payment method trở thành dữ liệu dùng chung và bao gồm `CASH`, `CREDIT_CARD`, `E_WALLET`; BookingPanel render từ danh sách này. Geometry preview không còn thay điểm hỏng bằng pickup giả: payload malformed sẽ bị từ chối để UI vào error state thật.

### 6. Accessibility và bundle

- Bỏ khóa zoom trong viewport.
- `Input` chỉ gắn `aria-describedby` khi feedback thực sự tồn tại.
- `Modal` có `role="dialog"`, `aria-modal`, label, focus ban đầu, focus trap, Escape và trả focus khi đóng.
- Nút sao, coupon, weather và icon-only controls có focus/accessibility state rõ ràng.
- Các page route được `React.lazy` + `Suspense`, không đổi URL hoặc phân quyền.

## Luồng dữ liệu và lỗi

- API lỗi rating: hiển thị toast lỗi, giữ nội dung đánh giá và modal.
- API weather GET lỗi: dashboard vẫn tải stats/users, hiển thị trạng thái chưa đồng bộ thay vì mặc định khẳng định trời bình thường.
- API wallet lỗi: không cho bật online do chưa xác minh điều kiện; vẫn cho tắt online nếu đang online.
- Socket reconnect: phát lại room, không tạo thêm listener nghiệp vụ.
- Geometry lỗi: preview bị loại, BookingPanel không cho đặt bằng route giả.
- Preview bị thay thế: ba request giá cũ bị hủy cùng lúc, không tiếp tục tiêu thụ tài nguyên hoặc ghi đè kết quả mới.

## Kiểm thử hoàn thành

- Unit test RED/GREEN cho rating controller, socket reconnect, wallet boundary, payment options và geometry normalization.
- Chạy toàn bộ `npm.cmd test`.
- Production build phải pass và tạo page chunks; main entry nhỏ hơn baseline 581.28 kB.
- Smoke test route auth và axe trên `/login`; lỗi khóa zoom và `aria-describedby` rỗng phải biến mất.
- Không thay đổi hành vi simulator: chỉ di chuyển tại `ACCEPTED` và `IN_TRANSIT`, không tự đổi trip status.
