# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-08-19

### Added
- **Frontend Architecture & Scaffolding (`apps/frontend`)**:
  - React 18, Vite 6, TypeScript 5, Tailwind CSS v4, Lucide Icons, Leaflet 1.9, Turf.js 7, Socket.io-client.
  - Grab-grade Brand Design System (Crab Primary Green `#00B14F`, Dark Green `#00843D`, Food Orange `#FF5B00`).
  - Pulsing Radar Wave animation, Shimmer loading skeleton, Glassmorphism UI tokens.
- **Authentication & RBAC 3 Roles (`CUSTOMER`, `DRIVER`, `ADMIN`)**:
  - Direct integration with NestJS backend `POST /api/v1/auth/login` and `POST /api/v1/auth/register`.
  - JWT token parsing and persistence with Zustand `authStore` & `localStorage`.
  - Quick 1-Click Demo Accounts button on login screen.
  - Driver registration form capturing detailed vehicle specs (`license_plate`, `vehicle_type`: BIKE/CAR, `vehicle_brand`, `color`, `vehicle_image` preview).
- **Interactive Leaflet Map & Customer Ride Booking**:
  - Leaflet Map with OpenStreetMap free tile server.
  - 1-click Preset Button for **Halo Building** (`10.782800, 106.695800`) and browser GPS locator.
  - OSRM Route Polyline preview with dynamic distance, duration, and fare estimation for CrabBike, CrabCar, CrabFood.
  - Pulsing Radar screen during `FINDING_DRIVER` search state.
  - Floating live tracking Bottom Sheet with 5-state machine stepper and 5-star interactive rating modal on completion.
- **Driver Dashboard & Concurrency Handling**:
  - Online/Offline toggle with live backend synchronization (`PATCH /api/v1/drivers/status`, `PATCH /api/v1/drivers/location`).
  - 15s Radial Countdown Timer popup for incoming trip offers.
  - Race condition `409 Conflict` friendly notification handling when multiple drivers accept simultaneously.
- **Admin Lightweight Management Panel**:
  - Metric summary cards (Total trips, GMV, online drivers, active users).
  - Real-time customer list table (`GET /api/v1/users/customers`) and driver list table (`GET /api/v1/users/drivers`).
  - User lock/unlock toggles (`PATCH /api/v1/users/:id/toggle-active`).
  - Extreme weather surge switch (`POST /api/v1/pricing/weather`) activating +50% surge multiplier.

### Changed
- Updated `API-CONTRACT.md` to synchronize auth, driver vehicle fields, OSRM geometry formatting, and admin stats endpoints.
- Synchronized all 19 agent skills across `.agents/skills/` and `apps/frontend/.agents/skills/`.
