# Offline Map Fallback and Session Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị nền map offline có nhãn rõ ràng khi tile OSM không tải được và loại bỏ state/socket của phiên User trước.

**Architecture:** `offlineMap.utils.ts` quyết định khi nào kích hoạt fallback từ sự kiện TileLayer. `OfflineMapLayer` chỉ tạo canvas tile cục bộ cho Leaflet. `authStore` gọi các action reset hiện có/mới của store tại session boundary; Customer hydration có controller thuần để xóa state khi API không tìm thấy trip.

**Tech Stack:** React 18, React Leaflet 4, Leaflet 1.9, Zustand 5, TypeScript 5, Node test runner.

## Global Constraints

- Chỉ sửa `apps/frontend`.
- Không thêm dependency, không gọi provider map khác, không thêm tile/asset lớn.
- Không thay đổi endpoint hoặc trip state machine.
- Mọi behavior mới có test RED trước implementation.

---

### Task 1: Offline fallback decision and Leaflet layer

**Files:**
- Create: `src/utils/offlineMap.utils.ts`
- Create: `src/components/map/OfflineMapLayer.tsx`
- Create: `tests/offline-map.test.mts`
- Modify: `src/components/map/CrabMap.tsx`

**Interfaces:**
- Produces: `shouldEnableOfflineMap(tileErrorCount: number, hasLoadedTile: boolean): boolean`.

- [x] Write a failing test that two failed tile requests with no successful tile request return `true`, while a successful tile request returns `false`.
- [x] Run the focused test and confirm RED because utility is absent.
- [x] Implement the pure utility and canvas `L.GridLayer`; attach `tileerror`/`tileload` handlers to primary TileLayer.
- [x] Re-run the focused test and confirm GREEN.

### Task 2: Session-bound store cleanup

**Files:**
- Modify: `src/stores/driverStore.ts`
- Modify: `src/stores/authStore.ts`
- Create: `tests/auth-session-isolation.test.mts`

**Interfaces:**
- Produces: `driverStore.resetSessionState(): void`; successful `authStore.login` and `logout` reset trip/driver stores and reconnect the socket only after old socket disconnects.

- [x] Write a failing test that the login session transition resets trip/driver state before reconnecting the socket.
- [x] Run the focused test and confirm RED because login retains stale state.
- [x] Implement the minimal reset actions and session boundary cleanup.
- [x] Re-run the focused test and confirm GREEN.

### Task 3: Customer active-trip hydration guard

**Files:**
- Create: `src/utils/customerTripHydration.utils.ts`
- Create: `tests/customer-trip-hydration.test.mts`
- Modify: `src/pages/customer/CustomerHomePage.tsx`

**Interfaces:**
- Produces: `hydrateCustomerActiveTrip(trip, onEmpty, onActive): boolean`.

- [x] Write a failing test that a `null` active-trip API response invokes `onEmpty` and does not invoke `onActive`.
- [x] Run the focused test and confirm RED because utility is absent.
- [x] Implement controller and use it for customer portal hydration.
- [x] Re-run the focused test and confirm GREEN.

### Task 4: Integration verification and tracking

**Files:**
- Modify: `DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`
- Modify: `ISSUES-LIST-TRACKING.md`

- [x] Run `npm.cmd test` and `npm.cmd run build`.
- [x] Run local browser smoke with OSM DNS blocked: route/markers plus offline layer visible; verify User login with no backend active trip shows booking panel rather than stale trip.
- [x] Run `git diff --check`; ensure all changed paths are under `apps/frontend`.
- [x] Record test/build evidence and the offline-map limitation in tracking logs.
