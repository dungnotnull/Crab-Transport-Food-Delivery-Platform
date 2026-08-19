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

## 2. API Endpoints cốt lõi (Draft)

### 2.1. Đặt cuốc (Customer)
- **POST** `/api/v1/orders/book`

### 2.2. Tài xế nhận cuốc
- **POST** `/api/v1/orders/:orderId/accept`

### 2.3. Trình giả lập tài xế (Simulator - Dev/Test)
- **POST** `/api/v1/simulator/simulate-trip`
- **Request Payload**:
  ```json
  {
    "orderId": "ORD-123456",
    "speedMultiplier": 2.0,
    "simulateFoodWait": true
  }
  ```

---

## 3. Websocket Events (Socket.io)

### Client ⇄ Server Event Contracts

| Event Name | Direction | Payload | Description |
| --- | --- | --- | --- |
| `driver:update_location` | Driver ➔ Server | `{ lat: number, lng: number, heading: number }` | Driver telemetry broadcast |
| `order:location_stream` | Server ➔ Customer | `{ orderId: string, lat: number, lng: number, heading: number }` | Relays driver position to customer |
| `order:status_changed` | Server ➔ Both | `{ orderId: string, status: OrderStatus, timestamp: string }` | State machine transition notification |
| `driver:order_offer` | Server ➔ Driver | `{ orderId: string, pickup: Point, dropoff: Point, fare: number }` | Incoming order dispatch alert |
