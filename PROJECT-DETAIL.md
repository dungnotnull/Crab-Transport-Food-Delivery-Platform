# Project Detail: Crab Platform

## Tech Stack
- **Backend**: NestJS (TypeScript), Clean Architecture / DDD
- **Frontend**: ReactJS (Vite, TailwindCSS)
- **Database**: PostgreSQL + PostGIS (Sử dụng TypeORM để mapping dữ liệu Geometry dễ dàng)
- **Real-time**: Socket.io
- **Maps & Routing**: Leaflet.js (UI Map), OSRM (Backend calculation path/distance)
- **Interpolation**: Turf.js (`turf.along`, `turf.length`) để mượt mà marker movement.
- **Infrastructure**: Docker, Docker Compose

## Project Structure
Dự án được tổ chức như sau:
```
crab/
├── apps/
│   ├── backend/   # NestJS API & Gateway (Chứa các modules: auth, orders, drivers, tracking, routing, simulator)
│   └── frontend/  # React SPA
└── osrm/          # OSRM routing data (tuỳ chọn self-host)
```

## Core Features
1. **User Role Management**: Admin, Customer, Driver.
2. **Booking Engine**: Dynamic fare calculation: `Total Fare = Base Fare + (Distance * Rate) * Surge Multiplier`.
3. **State Machine**: Vòng đời đơn hàng rất nghiêm ngặt: `FINDING_DRIVER` -> `ACCEPTED` -> `ARRIVED_AT_PICKUP` / `ARRIVED_AT_RESTAURANT` -> `WAITING_FOR_FOOD` -> `IN_TRANSIT` -> `ARRIVED_AT_DESTINATION` -> `COMPLETED`.
4. **Matching Algorithm**: PostGIS spatial indexing (`ST_DWithin`). Bán kính tìm kiếm 3km (3000m) lọc tài xế `is_online = true` và `active_order_id IS NULL`.
5. **Live Tracking & Simulator**: Socket.io + worker giả lập di chuyển.
