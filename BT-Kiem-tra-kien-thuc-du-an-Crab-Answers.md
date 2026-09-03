# Bài Tập Kiểm Tra Kiến Thức Dự Án Crab

Dưới đây là các câu trả lời cho các câu hỏi dựa trên source code của dự án Crab.

## 1. Mô tả full flow logic/business/chức năng trong dự án của từng role: customer, driver, admin.

*   **Customer (Khách hàng):**
    *   **Đặt xe (Booking):** Nhập điểm đón và điểm đến -> chọn loại xe -> hệ thống tính toán giá tiền và khoảng cách . Áp dụng mã giảm giá (Coupons) nếu có.
    *   **Theo dõi chuyến đi:** Sau khi đặt, hệ thống tìm tài xế -> Khách hàng theo dõi vị trí thực tế của tài xế trên bản đồ (thông qua WebSocket).
    *   **Thanh toán & Đánh giá:** Thanh toán tiền mặt (hoặc ví) khi hoàn thành chuyến đi và gửi đánh giá (Review/Rating) cho tài xế. 

*   **Driver (Tài xế):**

    *   **Định vị:** Liên tục gửi vị trí GPS của mình lên hệ thống để khách hàng theo dõi và hệ thống phân phối cuốc.
    *   **Nhận chuyến (Dispatching):** Nhận thông báo chuyến đi được gửi qua WebSocket -> "Nhận cuốc" hoặc bỏ qua .
    *   **Thực hiện chuyến:** Cập nhật trạng thái chuyến đi (`ACCEPTED` -> `DRIVER_ARRIVING` -> `ARRIVED_AT_PICKUP` -> `IN_TRANSIT` -> `ARRIVED_AT_DESTINATION` -> `COMPLETED`).
    *   **Ví & Thu nhập:** Quản lý số dư trong ví . Trừ tiền hoa hồng (Platform fee) cho nền tảng hoặc nhận tiền nếu khách dùng khuyến mãi. Nếu số dư dưới mức tối thiểu (MIN_WALLET_BALANCE) sẽ bị khóa (Blocked) không cho nhận cuốc.

*   **Admin (Quản trị viên):**
    *   **Quản lý cấu hình:** Quản lý các tham số hệ thống (System Configs) như `MIN_WALLET_BALANCE`.
    *   **Giám sát:** Theo dõi trạng thái của Users, Drivers, Trips.

---

## 2. Mô tả các flow áp dụng socket có trong dự án (giải quyết vấn đề gì + flow từ FE đến BE đến FE ra sao)

Hệ thống sử dụng WebSocket (thông qua thư viện `socket.io` & `@nestjs/websockets`) chủ yếu ở `TrackingGateway`.

*   **Flow 1: Cập nhật và theo dõi vị trí tài xế (Location Stream)**
    *   **Vấn đề:** Khách hàng cần thấy xe của tài xế di chuyển theo thời gian thực (Real-time).
    *   **Flow:**
        1.  **FE (Driver):** Liên tục gửi event `driver:update_location` kèm tọa độ `(lat, lng)` và `tripId` lên Backend (BE).
        2.  **BE (Gateway):** Nhận được event, ngay lập tức broadcast (phát) event `trip:location_stream` vào room `trip_${tripId}`. Đồng thời lưu trữ tọa độ  trong RAM. Cứ mỗi 10 giây (cronjob), BE sẽ  lưu tọa độ hàng loạt vào Database để tối ưu hiệu suất.
        3.  **FE (Customer):** Lắng nghe room `trip_${tripId}`, nhận event `trip:location_stream` và dùng Leaflet vẽ marker xe di chuyển trên bản đồ.

*   **Flow 2: Gửi thông báo cuốc xe mới (Dispatch/Offer)**
    *   **Vấn đề:** BE cần thông báo lập tức cho danh sách các tài xế phù hợp (gần khách hàng) khi có người đặt xe.
    *   **Flow:**
        1.  **BE:** Khi có event `trip.created`, `TripsService` tìm danh sách tài xế gần đó và dùng `TrackingGateway.emitOrderOffer` để gửi event `driver:trip_offer` trực tiếp vào room cá nhân của từng tài xế (`driver_${driverId}`).
        2.  **FE (Driver):** Lắng nghe event này và hiển thị Popup "Có chuyến mới"

*   **Flow 3: Đồng bộ trạng thái chuyến đi (Trip Status Sync)**
    *   **Vấn đề:** Khi tài xế đổi trạng thái  khách hàng phải thấy ngay lập tức.
    *   **Flow:**
        1.  **FE (Driver):** Gọi API PATCH `/api/v1/trips/:id/status`.
        2.  **BE:** Cập nhật DB thành công, Gateway emit event `trip:status_changed` vào room `trip_${tripId}`.
        3.  **FE (Customer/Driver):** Nghe event và cập nhật giao diện (UI) lập tức sang bước tiếp theo.

---

## 3. Mô tả flow định vị driver và customer khi bắt đầu bật app

*   **Sử dụng thư viện:** Client (Customer & Driver) đều dùng Web API mặc định của thiết bị là `navigator.geolocation.getCurrentPosition`.
*   **Flow xử lý để định vị chính xác:**
    1.  Khi Customer hoặc Driver mở app và cấp quyền vị trí, hàm `getCurrentPosition` được gọi để lấy vĩ độ và kinh độ .
    2.  **Đối với Customer:** Tọa độ GPS sẽ được gửi qua dịch vụ Geocoding  để dịch ngược (reverse geocoding) thành địa chỉ văn bản dễ đọc . Nếu lỗi mạng, hiển thị chuỗi fallback "Vị trí GPS hiện tại của tôi".
    3.  **Đối với Driver:** Tọa độ sẽ được set làm vị trí hiện tại của tài xế (`setDriverLocation`) và đồng thời gửi lên BE qua API/Socket để hệ thống biết tài xế đang online ở đâu. Nếu tài xế từ chối cấp quyền, hệ thống dùng tọa độ fallback cứng 
---

## 4. Research và mô tả các non-function requirements cần thiết cho dự án này khi triển khai thực tế

*   **Scalability :** Lượng đặt xe tăng vọt vào giờ cao điểm  yêu cầu hệ thống phải auto-scale (mở rộng tự động). 
*   **Performance & Low Latency** Trải nghiệm theo dõi xe di chuyển phải mượt mà. Yêu cầu độ trễ (latency) của WebSocket phải < 100ms. Thuật toán tìm tài xế gần nhất (Spatial query với PostGIS hoặc MongoDB 2dsphere) phải cực nhanh (< 200ms).
*   **Consistency vs Concurrency :** Ngăn chặn race condition (nhiều tài xế tranh một cuốc, mã giảm giá dùng quá giới hạn) bằng cơ chế Distributed Lock hoặc DB Pessimistic/Optimistic Lock.

---

## 5. Hệ thống đang xử lý ra sao trong trường hợp nhiều driver cùng nhấn nút "Nhận cuốc" của một customer A

Vấn đề nhiều tài xế tranh 1 cuốc (Race Condition) được xử lý  tại **Backend (`trips.service.ts` -> hàm `acceptTrip`)**:

1.  Hệ thống sử dụng **Database Transaction** và cơ chế **Pessimistic Lock (Khóa bi quan)**.
2.  Khi một tài xế bấm nhận chuyến, BE truy vấn row dữ liệu của Trip đó và khóa nó lại (`.setLock('pessimistic_write')`).
3.  Kiểm tra điều kiện: `if (trip.status !== TripStatus.FINDING_DRIVER)`.
4.  Tài xế bấm đầu tiên (vào được lock) sẽ thỏa mãn điều kiện, cập nhật trip status sang `ACCEPTED` và gắn `driver_id`, sau đó commit transaction (nhả lock).
5.  Các tài xế bấm sau, khi transaction thứ nhất nhả lock, transaction của họ mới được chạy tiếp. Nhưng lúc này, `trip.status` đã bị biến thành `ACCEPTED`, nên hệ thống sẽ quăng ra lỗi `ConflictException('Trip has already been accepted or cancelled')`.

---

## 6. Mô tả full flow request API đi từ FE -> BE cho việc trừ/cộng tiền của driver sau khi cuốc được hoàn thành

Flow quản lý ví và thanh toán nằm tại **`TripsController`, `TripsService` và `WalletsService`**:

1.  **FE (Driver):** Khi chở khách đến nơi, bấm "Hoàn thành" -> FE gọi API: `PATCH /api/v1/trips/:id/status` với body `{"status": "COMPLETED"}`.
2.  **BE (Controller -> Service):** `TripsService.updateStatus` nhận request, tạo Transaction. Nếu trạng thái hợp lệ, cập nhật `trip.status = COMPLETED`.
3.  **BE (Tính toán tiền - WalletsService):**
    *   Hệ thống gọi hàm `processTripRevenue`.
    *   Khóa ví của tài xế bằng Pessimistic Lock.
    *   Tính toán biến động ví: `amountChanged = driverRevenue - customerPaid`.
        *   *Trường hợp 1 (Khách trả tiền mặt):* `customerPaid = total_fare`. Do phải trừ tiền hoa hồng nền tảng, `driverRevenue < total_fare`, nên `amountChanged` ra số **âm**. Ví tài xế sẽ bị **trừ đi (khấu trừ)** số tiền này (Tiền phế nộp công ty).
        *   *Trường hợp 2 (Khách dùng mã giảm giá 100%):* `customerPaid = 0`. Tiền doanh thu của cuốc đó sẽ được công ty cộng vào ví tài xế (`amountChanged` ra số **dương**).
    *   Lưu số dư mới vào DB (`wallet.balance += amountChanged`).
    *   Nếu số dư mới rớt xuống dưới `MIN_WALLET_BALANCE`, tài xế tự động bị chuyển `WalletStatus` sang `BLOCKED` (Tài khoản bị khóa, không nhận cuốc được nữa).
    *   Ghi một dòng lịch sử giao dịch (WalletTransaction).
4.  **BE (Response):** Commit transaction, emit event `trip:status_changed` sang Customer FE báo chuyến đã hoàn tất.

---

## 7. [Không dung AI] Khó khăn khi thực hiện dự án Crab này ở role của mình?

- Mặc dù đã break task trơn tru hơn so với các dự án trước đó, nhưng vẫn còn hạn chế trong việc check các task được agent break do thiếu technical skill và kinh nghiệm về domain

## 8. [Không dung AI] Liệt kê ngắn gọn các kiến thức mới đã học được qua dự án này và tự đề xuất 3 idea mới cho dự án này tốt hơn.

**Các kiến thức mới học được:**
- Hiểu được về cơ chế vận hành bvasic nhất của 1 app về vận chuyển


**3 Idea đề xuất để dự án tốt hơn:**
1. **Hệ thống Heatmap (Bản đồ nhiệt dự đoán nhu cầu):** Hiển thị bản đồ nhiệt (nơi có nhiều người mở app/đặt xe) cho Driver thấy, giúp họ chủ động di chuyển đến khu vực có nhu cầu cao để tăng tỷ lệ nhận cuốc.
2. **Tích hợp In-app Chat :** Thêm tính năng chat  giữa Customer và Driver mà không cần lộ số điện thoại cá nhân.
3. **Cơ chế Batching / Ghép chuyến (Ride-sharing/Carpooling):**  ghép các chuyến xe  có cùng tuyến đường để tối ưu hóa quãng đường  chi phí chuyến đi cho khách hàng.
