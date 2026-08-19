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

### 2.1. Đăng ký tài khoản (Customer/Driver)
- **POST** `/api/v1/auth/register`
- **Payload**:
  ```json
  {
    "email": "driver1@crab.com",
    "password": "password123",
    "full_name": "Nguyen Van A",
    "phone_number": "0987654321",
    "role": "DRIVER",
    "license_plate": "59P1-12345", // Bắt buộc nếu role = DRIVER
    "vehicle_type": "BIKE",        // Bắt buộc nếu role = DRIVER
    "color": "Red"                 // Tùy chọn
  }
  ```

### 2.2. Xem trước cước phí và bản đồ đường đi (Customer)
- **POST** `/api/v1/orders/preview`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "pickup": { "lat": 10.762622, "lng": 106.660172 },
    "dropoff": { "lat": 10.776889, "lng": 106.700806 }
  }
  ```
- **Response**: Trả về `distance`, `duration`, `fare` và đặc biệt là `geometry` (mảng tọa độ geojson để Frontend dùng thư viện Leaflet vẽ polyline đường đi thực tế).

### 2.2. Đặt cuốc (Customer)
- **POST** `/api/v1/orders/book`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "pickup": { "lat": 10.762622, "lng": 106.660172 },
    "dropoff": { "lat": 10.776889, "lng": 106.700806 },
    "vehicleType": "BIKE"
  }
  ```

### 2.2. Tài xế nhận cuốc (Driver)
- **POST** `/api/v1/orders/:id/accept`
- **Headers**: `Authorization: Bearer <token>`

### 2.3. Hủy cuốc (Customer/Driver)
- **POST** `/api/v1/orders/:id/cancel`
- **Headers**: `Authorization: Bearer <token>`

### 2.4. Cập nhật trạng thái cuốc (Driver)
- **PATCH** `/api/v1/orders/:id/status`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "status": "ARRIVED_AT_RESTAURANT" 
    // Các giá trị: ARRIVED_AT_PICKUP, IN_TRANSIT, ARRIVED_AT_RESTAURANT, WAITING_FOR_FOOD, ARRIVED_AT_DESTINATION, COMPLETED
  }
  ```

### 2.5. Đánh giá chuyến đi (Customer)
- **POST** `/api/v1/orders/:id/rating`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "rating": 5,
    "feedback": "Tài xế thân thiện, đi cẩn thận!"
  }
  ```

### 2.6. Trình giả lập tài xế (Simulator - Dev/Test)
- **POST** `/api/v1/simulator/simulate-trip`
- **Payload**:
  ```json
  {
    "orderId": "ORD-123456",
    "simulateFoodWait": true
  }
  ```

### 2.7. Bật/Tắt Thời tiết cực đoan (Admin/System Admin)
- **POST** `/api/v1/pricing/weather`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "isRaining": true
  }
  ```
- **Mô tả**: Khi bật cờ này, hàm tính cước `calculateFare` sẽ tự động kích hoạt surge giá `+50%` do điều kiện thời tiết khắc nghiệt.

### 2.8. Cập nhật trạng thái Trực tuyến của Tài xế (Driver)
- **PATCH** `/api/v1/drivers/status`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "is_online": true
  }
  ```

### 2.9. Cập nhật vị trí ban đầu của Tài xế (Driver)
- **PATCH** `/api/v1/drivers/location`
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "lat": 10.762622,
    "lng": 106.660172
  }
  ```

### 2.10. Quản lý Người dùng (Dành cho Admin CMS)
- **GET** `/api/v1/users/customers`
  - Lấy danh sách toàn bộ khách hàng.
- **GET** `/api/v1/users/drivers`
  - Lấy danh sách toàn bộ tài xế (Kèm thông tin xe `driverProfile`).
- **PATCH** `/api/v1/users/:id/toggle-active`
  - Khóa/Mở khóa tài khoản (Payload: `{ "is_active": false }`).
- **Headers cho các API trên**: `Authorization: Bearer <token>` (Yêu cầu role `SYSTEM_ADMIN` hoặc `ADMIN`).

---

## 3. Websocket Events (Socket.io)

Endpoint Gateway: `ws://localhost:3000` (Handshake Auth với token `Bearer`).

### Client ⇄ Server Event Contracts

| Event Name | Direction | Payload | Description |
| --- | --- | --- | --- |
| `join_room` | Client ➔ Server | `order_ORD-123456` | Khách hàng join vào room của Order để nghe cập nhật |
| `driver:update_location` | Driver ➔ Server | `{ orderId: string, lat: number, lng: number }` | Tài xế báo vị trí liên tục |
| `order:location_stream` | Server ➔ Customer | `{ driverId: string, lat: number, lng: number, timestamp: string }` | Báo vị trí tài xế cho Customer theo thời gian thực |
| `order:status_changed` | Server ➔ Both | `{ orderId: string, status: OrderStatus, timestamp: string }` | Thông báo tự động khi trạng thái thay đổi |
| `driver:order_offer` | Server ➔ Driver | `{ orderId: string, pickup: Point, dropoff: Point, fare: number, expiredAt: string }` | Hệ thống nổ cuốc cho tài xế |
