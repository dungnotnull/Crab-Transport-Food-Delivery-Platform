# Phase 1–9 Frontend Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa các bug Phase 1–9 đã xác nhận, tăng khả năng phục hồi và accessibility mà không đổi backend/state machine.

**Architecture:** Business rules được tách thành utility/controller thuần TypeScript để kiểm thử bằng Node test runner hiện có. Component giữ vai trò điều phối; SocketService dùng injected factory để test reconnect; route page dùng React lazy loading để giảm entry bundle.

**Tech Stack:** React 18, TypeScript 5.7, Zustand 5, Socket.IO Client 4, Vite 6, Node test runner.

## Global Constraints

- Chỉ sửa file trong `apps/frontend`.
- Không thay đổi trip state machine hoặc tự động đổi status từ simulator.
- Không thêm dependency runtime/test mới.
- Viết test trước và xác nhận test fail đúng nguyên nhân trước khi sửa production code.
- Giữ contract payload REST/Socket hiện tại.

---

### Task 1: Rating submission controller

**Files:**
- Create: `apps/frontend/src/utils/ratingSubmission.utils.ts`
- Create: `apps/frontend/tests/rating-submission.test.mts`
- Modify: `apps/frontend/src/components/customer/RatingModal.tsx`

**Interfaces:**
- Produces: `submitTripRating(options): Promise<boolean>`; chỉ gọi `onSuccess` sau API success và gọi `onError` khi reject.

- [ ] Viết test success xác nhận rate API nhận đúng trip/rating/feedback và success callback chạy.
- [ ] Viết test failure xác nhận success callback không chạy, error callback chạy và kết quả là `false`.
- [ ] Chạy riêng test để xác nhận RED vì module chưa tồn tại.
- [ ] Implement controller và chuyển RatingModal sang dùng controller.
- [ ] Chạy riêng test để xác nhận GREEN.

### Task 2: Socket room recovery

**Files:**
- Modify: `apps/frontend/src/services/socket.service.ts`
- Create: `apps/frontend/tests/socket-service.test.mts`

**Interfaces:**
- Produces: exported `SocketService` nhận optional `SocketFactory`; `joinRoom(room)` nhớ room; callback `connect` phát lại room.

- [ ] Viết fake socket có `on`, `off`, `emit`, `disconnect` và trigger event.
- [ ] Viết test join khi đã connected chỉ emit một lần và join trùng không nhân bản.
- [ ] Viết test reconnect phát lại từng room đúng một lần.
- [ ] Chạy test để xác nhận RED do class/factory chưa public và room chưa được replay.
- [ ] Implement room registry trong SocketService, giữ nguyên singleton export.
- [ ] Chạy test để xác nhận GREEN.

### Task 3: Weather state và wallet guard

**Files:**
- Create: `apps/frontend/src/utils/driverWallet.utils.ts`
- Create: `apps/frontend/src/utils/weatherStatus.utils.ts`
- Create: `apps/frontend/tests/driver-wallet.test.mts`
- Create: `apps/frontend/tests/weather-status.test.mts`
- Modify: `apps/frontend/src/services/admin.service.ts`
- Modify: `apps/frontend/src/pages/admin/AdminOverviewPage.tsx`
- Modify: `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`

**Interfaces:**
- Produces: `MIN_DRIVER_WALLET_BALANCE`, `canDriverGoOnline(balance)` và `normalizeWeatherStatus(payload)`.

- [ ] Viết test wallet cho `null`, 99.999, 100.000 và lớn hơn ngưỡng.
- [ ] Viết test weather cho payload boolean hợp lệ và payload malformed.
- [ ] Chạy test để xác nhận RED vì utility chưa tồn tại.
- [ ] Implement utility, GET weather service, loading/error state và guard online.
- [ ] Chạy test để xác nhận GREEN.

### Task 4: Payment options và geometry validation

**Files:**
- Create: `apps/frontend/src/utils/paymentMethods.utils.ts`
- Create: `apps/frontend/src/utils/latestRequest.utils.ts`
- Create: `apps/frontend/tests/payment-methods.test.mts`
- Create: `apps/frontend/tests/latest-request.test.mts`
- Modify: `apps/frontend/src/utils/tripNormalization.utils.ts`
- Modify: `apps/frontend/src/services/trip.service.ts`
- Modify: `apps/frontend/src/components/customer/BookingPanel.tsx`
- Modify: `apps/frontend/tests/trip-normalization.test.mts`

**Interfaces:**
- Produces: `PAYMENT_METHOD_OPTIONS`; `normalizeRouteGeometry(raw)` trả `[lat,lng][]` hoặc throw; `LatestRequestController` hủy preview cũ.

- [ ] Viết test xác nhận đủ ba payment method và không trùng value.
- [ ] Viết test geometry GeoJSON/Leaflet hợp lệ và point malformed bị từ chối.
- [ ] Chạy test để xác nhận RED.
- [ ] Implement options render và geometry normalization.
- [ ] Truyền một `AbortSignal` cho cả ba preview và hủy nhóm cũ khi input đổi/unmount.
- [ ] Chạy test để xác nhận GREEN.

### Task 5: Accessibility và lazy routes

**Files:**
- Modify: `apps/frontend/index.html`
- Modify: `apps/frontend/src/components/common/Input.tsx`
- Modify: `apps/frontend/src/components/common/Modal.tsx`
- Modify: `apps/frontend/src/components/customer/RatingModal.tsx`
- Modify: `apps/frontend/src/components/customer/BookingPanel.tsx`
- Modify: `apps/frontend/src/pages/admin/AdminOverviewPage.tsx`
- Modify: `apps/frontend/src/App.tsx`

**Interfaces:**
- Modal tiếp tục nhận API props cũ, bổ sung semantics/focus nội bộ không yêu cầu caller đổi.

- [ ] Dùng baseline axe/build đã fail về viewport/ARIA và bundle 581.28 kB làm RED evidence.
- [ ] Implement viewport, Input, Modal, focus ring và aria busy/labels.
- [ ] Chuyển page imports sang `React.lazy` với named-export adapters và thêm Suspense fallback ổn định.
- [ ] Build và axe lại; xác nhận lỗi viewport/ARIA hết và entry bundle giảm.

### Task 6: Regression và tracking

**Files:**
- Modify: `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`
- Modify: `apps/frontend/ISSUES-LIST-TRACKING.md`

**Interfaces:**
- Không tạo interface production mới.

- [ ] Chạy toàn bộ `npm.cmd test` và `npm.cmd run build`.
- [ ] Smoke test `/login`, `/customer`, `/driver`, `/admin` khi chưa đăng nhập.
- [ ] Kiểm tra `git diff --check` và chỉ ghi thay đổi thuộc frontend.
- [ ] Cập nhật tracking logs với bằng chứng test/build và các giới hạn còn lại.
