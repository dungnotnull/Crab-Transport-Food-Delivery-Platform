# General Convention & System Architecture
## 1. Mục tiêu dự án
Crab Transport & Food Delivery Platform - Hệ thống đặt xe và giao thức ăn thời gian thực.

## 2. Kiến trúc Tổng quan (Global Architecture)
- **Cấu trúc Repo**: Tổ chức theo cấu trúc project chuẩn thư mục `apps/backend` (NestJS) và `apps/frontend` (ReactJS).
- **Mô hình Backend**: Modular Monolith áp dụng tư duy **Clean Architecture / Domain-Driven Design (DDD)**.
- **Database**: PostgreSQL (Relational Data) + PostGIS (Geospatial Data).
- **Giao tiếp Frontend - Backend**: 
  - RESTful APIs cho các tác vụ CRUD, Booking, Auth.
  - WebSockets (Socket.io) cho Real-time Tracking (vị trí tài xế) và Cập nhật trạng thái đơn.
- **Map/Routing**: OSRM cho routing, Leaflet.js cho hiển thị UI.

## 3. Quy chuẩn Code (Global Conventions)
- **Ngôn ngữ**: TypeScript 100% (cả FE & BE).
- **Naming Convention**: 
  - `camelCase` cho biến, function.
  - `PascalCase` cho Class, Type, Interface.
  - `kebab-case` cho tên file/folder (VD: `order.controller.ts`).
- **Ngôn ngữ commit & docs**: Tiếng Anh (Code/Commit), Tiếng Việt (Docs/Giải thích nghiệp vụ).

## 4. Giao tiếp giữa các Module (Inter-module Communication)
Trong backend (Modular Monolith):
- Sử dụng **Dependency Injection (DI)** của NestJS cho các tác vụ gọi đồng bộ (Sync).
- Sử dụng **Event Emitter** (`@nestjs/event-emitter`) cho các tác vụ bất đồng bộ (Async) nhằm giảm coupling (Ví dụ: Order created -> Emit event -> Tracking module bắt event khởi tạo Socket Room).
