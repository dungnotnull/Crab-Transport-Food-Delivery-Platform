# API Contract (Source of Truth)

Tài liệu này định nghĩa cấu trúc dữ liệu giao tiếp chuẩn giữa Frontend và Backend.
> **Lệnh dành cho AI Agents (FE/BE)**: TRƯỚC KHI tạo mới/sửa DTO endpoint hay đổi interface Axios, LUÔN đọc và cập nhật file này trước. Đây là nguồn chân lý để Frontend và Backend thống nhất dữ liệu.

---

## 1. Chuẩn Response API Chung
Mọi API trả về đều tuân thủ cấu trúc sau:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "error": null
}
```

---

## 2. API Endpoints cốt lõi

### 2.1. Đăng nhập hệ thống (Hỗ trợ 3 Roles: CUSTOMER, DRIVER, ADMIN)
- **POST** `/api/v1/auth/login`
- **Payload**:
  ```json
  {
    "email": "customer@crab.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "user": {
        "id": "usr_123456",
        "email": "customer@crab.com",
        "full_name": "Nguyễn Văn A",
        "phone_number": "0987654321",
        "role": "CUSTOMER", // CUSTOMER | DRIVER | ADMIN | SYSTEM_ADMIN
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
        "driverProfile": null // Chứa thông tin xe nếu role = DRIVER
      }
    },
    "error": null
  }
  ```

### 2.2. Đăng ký tài khoản (Customer & Driver với đầy đủ thông tin phương tiện + hình ảnh)
- **POST** `/api/v1/auth/register`
- **Payload**:
  ```json
  {
    "email": "driver1@crab.com",
    "password": "password123",
    "full_name": "Trần Văn Tài Xế",
    "phone_number": "0912345678",
    "role": "DRIVER", // "CUSTOMER" hoặc "DRIVER"
    "avatar_url": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61", // Tùy chọn ảnh chân dung
    
    // --- Các trường bắt buộc NẾU role = DRIVER ---
    "license_plate": "59P1-88888",     // Biển số xe
    "vehicle_type": "BIKE",            // "BIKE" | "CAR_4" | "CAR_7"
    "vehicle_brand": "Honda Wave Alpha", // Hiệu xe / Dòng xe
    "color": "Xanh lá",                // Màu sắc xe
    "vehicle_image": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc" // Ảnh chụp xe
  }
  ```

### 2.3. Xem trước cước phí và bản đồ đường đi (Customer)
- **POST** `/api/v1/trips/preview`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    // Tọa độ mẫu chuẩn: Điểm đón tại Halo Building
    "pickup": { 
      "lat": 10.782800, 
      "lng": 106.695800,
      "address": "Tòa nhà Halo Building, Quận 1, TP. Hồ Chí Minh" 
    },
    // Điểm đến (Dropoff)
    "dropoff": { 
      "lat": 10.776889, 
      "lng": 106.700806,
      "address": "Chợ Bến Thành, Quận 1, TP. Hồ Chí Minh" 
    }
  }
  ```
- **Response**: Trả về `distance` (mét/km), `duration` (giây/phút), `fare` (VND) và mảng `geometry` (tọa độ geojson để Leaflet vẽ Polyline thực tế).

### 2.4. Đặt cuốc (Customer)
- **POST** `/api/v1/trips/book`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "pickup": { "lat": 10.782800, "lng": 106.695800, "address": "Halo Building" },
    "dropoff": { "lat": 10.776889, "lng": 106.700806, "address": "Chợ Bến Thành" },
    "vehicleType": "BIKE", // BIKE | CAR_4 | CAR_7
    "coupon_code": "WELCOME10K",
    "paymentMethod": "CASH" // CASH (Mặc định), CREDIT_CARD, E_WALLET
  }
  ```

### 2.5. Tài xế nhận cuốc (Driver)
- **POST** `/api/v1/trips/:id/accept`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  - Thành công `200`: Chuyển đơn sang `ACCEPTED`.
  - Thất bại `409 Conflict`: "Cuốc xe đã được tài xế khác tiếp nhận!" (Pessimistic Lock).

### 2.6. Hủy cuốc (Customer/Driver)
- **POST** `/api/v1/trips/:id/cancel`
- **Headers**: `Authorization: Bearer <token>`

### 2.7. Cập nhật trạng thái cuốc (Driver)
- **PATCH** `/api/v1/trips/:id/status`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "status": "ARRIVED_AT_PICKUP" 
    // Các giá trị: ARRIVED_AT_PICKUP, IN_TRANSIT, ARRIVED_AT_DESTINATION, COMPLETED
  }
  ```

### 2.8. Đánh giá chuyến đi (Customer)
- **POST** `/api/v1/trips/:id/rating`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "rating": 5,
    "feedback": "Tài xế lái xe cẩn thận, đúng giờ!"
  }
  ```

### 2.9. Trình giả lập tài xế ảo (Simulator - Dev/Test Tool)
- **POST** `/api/v1/simulator/simulate-trip`
- **Payload**:
  ```json
  {
    "tripId": "ORD-123456",
    "speedMultiplier": 2.0
  }
  ```

### 2.10. Cập nhật trạng thái Trực tuyến & Vị trí Tài xế (Driver)
- **PATCH** `/api/v1/drivers/status` -> `{ "is_online": true }`
- **PATCH** `/api/v1/drivers/location` -> `{ "lat": 10.782800, "lng": 106.695800 }`
- **Headers**: `Authorization: Bearer <token>`

### 2.11. Quản lý Thống kê & Người dùng Đơn giản (Dành cho Admin Dashboard)
- **GET** `/api/v1/users/customers`
  - Lấy danh sách toàn bộ khách hàng.
- **GET** `/api/v1/users/drivers`
  - Lấy danh sách toàn bộ tài xế kèm biển số xe, hiệu xe, ảnh và rating `driverProfile.average_rating`.
- **GET** `/api/v1/admin/stats` (hoặc tính toán tổng hợp trên FE)
  - Tổng số cuốc xe, Tổng doanh thu, Số tài xế đang online.
- **PATCH** `/api/v1/users/:id/toggle-active`
  - Khóa/Mở khóa tài khoản (Payload: `{ "is_active": false }`).
- **POST** `/api/v1/pricing/weather`
  - Bật/Tắt Thời tiết mưa bão (Surge +50%) `{ "isRaining": true }`.
- **Headers cho các API Admin**: `Authorization: Bearer <token>` (Yêu cầu role `SYSTEM_ADMIN` hoặc `ADMIN`).

### 2.12. Quản lý Khuyến mãi / Coupons (Dành cho Admin & Customer)
- **POST** `/api/v1/coupons`
  - Tạo mới coupon (Admin / System Admin).
  - Payload:
    ```json
    {
      "code": "SUMMER2026",
      "discount_type": "PERCENTAGE", // "PERCENTAGE" hoặc "FIXED_AMOUNT"
      "discount_value": 20,          // 20% hoặc số tiền cố định (VND)
      "min_trip_value": 30000,       // Giá trị chuyến đi tối thiểu (VND)
      "max_discount": 25000,         // Mức giảm tối đa (VND, dùng cho PERCENTAGE)
      "usage_limit": 500,            // Số lượt dùng tối đa
      "valid_from": "2026-08-01T00:00:00.000Z", // (Tùy chọn, mặc định: thời điểm tạo)
      "valid_until": "2026-12-31T23:59:59.000Z",
      "is_active": true
    }
    ```
- **GET** `/api/v1/coupons`
  - Lấy danh sách toàn bộ coupon (Admin / System Admin).
- **GET** `/api/v1/coupons/active`
  - Lấy danh sách coupon đang hoạt động và còn hạn sử dụng (Customer / Admin).
- **POST** `/api/v1/coupons/validate`
  - Kiểm tra tính hợp lệ và tính số tiền giảm giá của coupon trước khi đặt xe (Customer / Admin).
  - Payload: `{ "code": "WELCOME10K", "originalFare": 50000 }`
  - Response `data`: `{ "discountAmount": 10000, "finalFare": 40000, "coupon": { ... } }`
- **GET** `/api/v1/coupons/:id`
  - Lấy chi tiết coupon theo ID (Admin / System Admin).
- **PATCH** `/api/v1/coupons/:id`
  - Cập nhật thông tin coupon (Admin / System Admin).
- **PATCH** `/api/v1/coupons/:id/toggle-active`
  - Bật / tắt kích hoạt coupon nhanh (Admin / System Admin). Payload (tùy chọn): `{ "is_active": false }`.
- **DELETE** `/api/v1/coupons/:id`
  - Xóa coupon (Admin / System Admin).

---

## 3. Websocket Events (Socket.io)

Endpoint Gateway: `ws://localhost:3000` (Handshake Auth với token `Bearer`).

### Client ⇄ Server Event Contracts

| Event Name | Direction | Payload | Description |
| --- | --- | --- | --- |
| `join_room` | Client ➔ Server | `trip_ORD-123456` | Khách hàng/Tài xế join vào room của Trip |
| `driver:update_location` | Driver ➔ Server | `{ tripId: string, lat: number, lng: number, heading?: number }` | Tài xế báo vị trí GPS liên tục |
| `trip:location_stream` | Server ➔ Customer | `{ driverId: string, lat: number, lng: number, heading: number, timestamp: string }` | Báo vị trí tài xế cho Customer theo thời gian thực |
| `trip:status_changed` | Server ➔ Both | `{ tripId: string, status: OrderStatus, reason?: string, timestamp: string }` | Thông báo tự động khi trạng thái chuyến đi thay đổi |
| `driver:trip_offer` | Server ➔ Driver | `{ tripId: string, pickup: Point, dropoff: Point, fare: number, expiredAt: string }` | Hệ thống nổ cuốc cho tài xế (15s countdown) |
