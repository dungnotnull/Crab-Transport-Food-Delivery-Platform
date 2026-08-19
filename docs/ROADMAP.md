# Project Roadmap (High-level)

## Phase 1: Foundation & Infrastructure Setup
- Cài đặt Docker Compose (PostgreSQL, PostGIS, pgAdmin, OSRM).
- Khởi tạo NestJS repo, cấu hình TypeORM/Postgres.
- Setup JWT Authentication (Customer, Driver roles).

## Phase 2: Core Booking & State Machine
- Xây dựng Order Entity & State Machine logic.
- Tích hợp OSRM để tính toán khoảng cách/thời gian.
- Xây dựng module Pricing (tính giá cơ bản theo cấu hình).

## Phase 3: Spatial Matching & Geospatial
- Thiết lập bảng Driver Location với PostGIS (GiST Index).
- Xây dựng thuật toán Matching (Tìm tài xế online bán kính N km).
- Luồng phát cuốc xe (Broadcast/Queue).

## Phase 4: Real-time Tracking & Simulator
- Thiết lập Socket.io Gateway trên Backend.
- Cấu hình Worker/Cron flush tọa độ xuống Database.
- Viết script Driver Simulator dùng Turf.js để mô phỏng tự động.

## Phase 5: Client Integration & Advanced
- Tích hợp ReactJS Customer App (Leaflet Map).
- Tích hợp ReactJS Driver App.
- Cập nhật Surge Pricing (theo thời tiết/giờ cao điểm).
