# Backend Specific Convention & Context

## 1. Framework & Core Libraries
- **NestJS** (phiên bản 10+).
- **TypeScript**: Bật chế độ `strict: true` trong `tsconfig.json`.
- **Database ORM**: TypeORM (Hỗ trợ native PostGIS Type tốt nhất trong hệ sinh thái Node).

## 2. Kiến trúc & Design Patterns
- **Kiến trúc**: Modular Monolith / **Clean Architecture / Domain-Driven Design (DDD)**.
- **Quy tắc chia Module (apps/backend/src/modules)**: Chia chuẩn theo README: `auth`, `orders`, `drivers`, `tracking`, `routing`, `simulator`.
- **Dependency Rule**: Các module KHÔNG gọi service của nhau một cách chằng chịt (tránh circular dependency). Nếu module A cần module B xử lý việc sau khi A xong, ưu tiên dùng **`@nestjs/event-emitter`** để decouple logic.

## 3. Database (TypeORM + Postgres + PostGIS)
- **Lưu ý AI**: Khi map entity chứa location, KHÔNG lưu lat/lng rời rạc. PHẢI dùng kiểu `geometry` chuẩn PostGIS với SRID: 4326. Index là `GiST`.
  ```typescript
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: Point;
  ```

## 4. Quản lý State Machine (Quan trọng)
- Logic State Machine NẰM TRONG `OrderService`. Trạng thái dựa đúng theo thiết kế README:
  - Khởi tạo: `FINDING_DRIVER`
  - Đã có tài xế: `ACCEPTED`
  - Ride-hailing: `ACCEPTED` -> `ARRIVED_AT_PICKUP` -> `IN_TRANSIT`
  - Food Delivery: `ACCEPTED` -> `ARRIVED_AT_RESTAURANT` -> `WAITING_FOR_FOOD` (10s delay simulator) -> `IN_TRANSIT`
  - Kết thúc: `ARRIVED_AT_DESTINATION` -> `COMPLETED`
  - Hủy: `CANCELLED`

## 5. Coding Rules cho AI Agent (Backend)
1. **Source of Truth**: LUÔN ĐỌC `API-CONTRACT.md` ở root folder trước khi tạo Controller/DTO.
2. **Task Tracking**: Sau khi code xong tính năng nào, PHẢI cập nhật file `DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md` (chuyển `[ ]` thành `[x]`).
