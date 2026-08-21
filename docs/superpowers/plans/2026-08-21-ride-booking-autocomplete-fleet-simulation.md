# Ride Booking Autocomplete and Fleet Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build exact pickup/destination autocomplete, a deterministic multi-driver map simulation, smooth real-driver marker movement, and resilient accept/cancel UI behavior without changing backend source.

**Architecture:** Keep backend dispatch authoritative while adding focused frontend boundaries for geocoding, deterministic display-only fleet simulation, marker interpolation, and trip UI guards. Extract behavior into pure TypeScript utilities so the frontend's existing Node test runner can prove address resolution, 3 km matching representation, competing-accept handling, and cancellation rules before React components consume them.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Zustand 5, Leaflet/react-leaflet, Turf.js 7, Socket.io client, Tailwind CSS 4, Node test runner.

## Global Constraints

- Do not modify any file under `apps/backend/`.
- Record every backend defect or missing backend capability in root `BUG-TRACKING.md` for backend follow-up.
- Real driver dispatch and the single-winner database guarantee remain backend-controlled.
- Use `VITE_GEOCODING_URL`, defaulting to `https://photon.komoot.io`, for Photon forward/reverse geocoding.
- Never send typed address text with stale coordinates; a route requires two resolved `LocationPoint` values.
- Use a 3,000 m visual eligibility boundary and exact vehicle-type equality to mirror the documented backend matching rules.
- Generate simulation positions relative to the selected pickup; do not add fixed Halo coordinates or `Math.random` movement.
- Simulated drivers never create, accept, cancel, or update a real trip.
- After acceptance, assigned-driver movement consumes only `trip:location_stream` telemetry.
- Follow `apps/frontend/RULE.md`: Vietnamese comments for complex logic, Crab palette, 48 px mobile targets, reduced-motion support, no dead code, no stray `console.log`.
- Apply strict TDD: write one focused failing test, observe the expected failure, add minimal production code, observe the pass, then refactor.

---

## File Map

### Create

- `apps/frontend/src/utils/tripRules.ts`: customer cancel matrix and acceptance-conflict classification/copy.
- `apps/frontend/tests/trip-rules.test.mts`: cancellation and `409` behavior tests.
- `apps/frontend/src/utils/geocoding.utils.ts`: Photon normalization, labels, cache keys, and resolved-input guard.
- `apps/frontend/src/services/geocoding.service.ts`: cached, abortable Photon forward/reverse HTTP client.
- `apps/frontend/tests/geocoding.test.mts`: geocoding normalization and stale-label protection tests.
- `apps/frontend/src/components/customer/AddressAutocomplete.tsx`: reusable accessible pickup/dropoff combobox.
- `apps/frontend/src/utils/fleetSimulation.utils.ts`: deterministic fleet generation, progress, and eligibility.
- `apps/frontend/tests/fleet-simulation.test.mts`: arbitrary-origin, radius, type, and deterministic movement tests.
- `apps/frontend/src/hooks/useFleetSimulation.ts`: lifecycle-safe simulation clock.
- `apps/frontend/src/utils/vehicleMotion.utils.ts`: pure interpolation and bearing helpers.
- `apps/frontend/tests/vehicle-motion.test.mts`: interpolation and heading tests.

### Modify

- `apps/frontend/package.json`: run every frontend `*.test.mts` file explicitly.
- `apps/frontend/src/types/trip.types.ts`: nullable endpoint-compatible and geocoding/fleet display types.
- `apps/frontend/src/stores/tripStore.ts`: unresolved pickup support and safe reset.
- `apps/frontend/src/services/trip.service.ts`: stop inventing route/fare breakdown data.
- `apps/frontend/src/components/customer/BookingPanel.tsx`: paired address inputs and resolved-only preview/booking.
- `apps/frontend/src/pages/customer/CustomerHomePage.tsx`: dynamic fleet, reverse lookup, and cancel guard wiring.
- `apps/frontend/src/components/map/CrabMap.tsx`: matching radius and eligibility-aware fleet markers.
- `apps/frontend/src/components/map/MovingVehicleMarker.tsx`: imperative 1.2 s interpolation with cleanup.
- `apps/frontend/src/components/customer/TripBottomSheet.tsx`: shared cancel matrix and request lock.
- `apps/frontend/src/components/driver/TripOfferModal.tsx`: single accept submission.
- `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`: centralized `409` handling without duplicate toast.
- `apps/frontend/src/index.css`: combobox/fleet motion details and mobile safe-area behavior.
- `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`: add implementation and verification evidence.
- `apps/frontend/ISSUES-LIST-TRACKING.md`: record resolved frontend issues.
- `BUG-TRACKING.md`: add open backend findings/requests without claiming a backend fix.

---

### Task 1: Trip UI Rules and Frontend Test Entry Points

**Files:**

- Create: `apps/frontend/src/utils/tripRules.ts`
- Create: `apps/frontend/tests/trip-rules.test.mts`
- Modify: `apps/frontend/package.json`

**Interfaces:**

- Produces: `canCustomerCancel(status: TripStatus): boolean`
- Produces: `isTripAcceptConflict(error: unknown): boolean`
- Produces: `getTripAcceptErrorMessage(error: unknown): string`
- Produces: an `npm.cmd test` command that executes the existing auth tests and every new focused test discovered by the test glob.

- [ ] **Step 1: Extend the test script and write the failing trip-rule tests**

Set the package script to the test glob supported by the repository's Node 24 runtime:

```json
"test": "node --experimental-strip-types --test tests/*.test.mts"
```

Create the initial `trip-rules.test.mts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCustomerCancel,
  getTripAcceptErrorMessage,
  isTripAcceptConflict,
} from '../src/utils/tripRules.ts';

test('allows customer cancellation only while finding or accepted', () => {
  assert.equal(canCustomerCancel('FINDING_DRIVER'), true);
  assert.equal(canCustomerCancel('ACCEPTED'), true);
  assert.equal(canCustomerCancel('ARRIVED_AT_PICKUP'), false);
  assert.equal(canCustomerCancel('IN_TRANSIT'), false);
  assert.equal(canCustomerCancel('ARRIVED_AT_DESTINATION'), false);
  assert.equal(canCustomerCancel('COMPLETED'), false);
  assert.equal(canCustomerCancel('CANCELLED'), false);
});

test('recognizes the losing response in a competing accept', () => {
  const conflict = { response: { status: 409 } };
  assert.equal(isTripAcceptConflict(conflict), true);
  assert.match(getTripAcceptErrorMessage(conflict), /tài xế khác/i);
  assert.equal(isTripAcceptConflict({ response: { status: 500 } }), false);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/trip-rules.test.mts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/utils/tripRules.ts`.

- [ ] **Step 3: Add the minimal trip UI rules**

Create `tripRules.ts`:

```typescript
import { TripStatus } from '../types/trip.types';

const CUSTOMER_CANCELLABLE_STATUSES = new Set<TripStatus>([
  'FINDING_DRIVER',
  'ACCEPTED',
]);

export function canCustomerCancel(status: TripStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.has(status);
}

export function isTripAcceptConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 409,
  );
}

export function getTripAcceptErrorMessage(error: unknown): string {
  return isTripAcceptConflict(error)
    ? 'Cuốc xe đã được tài xế khác tiếp nhận!'
    : 'Không thể nhận cuốc. Vui lòng thử lại.';
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/trip-rules.test.mts`

Expected: 2 tests pass.

- [ ] **Step 5: Commit the independent rule boundary**

```bash
git add apps/frontend/package.json apps/frontend/src/utils/tripRules.ts apps/frontend/tests/trip-rules.test.mts
git commit -m "test(frontend): define trip accept and cancel rules"
```

---

### Task 2: Photon Geocoding Boundary

**Files:**

- Create: `apps/frontend/src/utils/geocoding.utils.ts`
- Create: `apps/frontend/src/services/geocoding.service.ts`
- Create: `apps/frontend/tests/geocoding.test.mts`
- Modify: `apps/frontend/src/types/trip.types.ts`

**Interfaces:**

- Produces: `AddressSuggestion { id, primaryText, secondaryText, point, osmType?, osmId? }`
- Produces: `normalizePhotonFeature(feature: unknown): AddressSuggestion | null`
- Produces: `isResolvedAddressValue(query: string, value: LocationPoint | null): boolean`
- Produces: `geocodingService.search(query, bias?, signal?)`
- Produces: `geocodingService.reverse(point, signal?)`

- [ ] **Step 1: Write failing Photon normalization and resolved-label tests**

Create `geocoding.test.mts` with a representative GeoJSON feature:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGeocodingCacheKey,
  isResolvedAddressValue,
  normalizePhotonFeature,
} from '../src/utils/geocoding.utils.ts';

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [106.700806, 10.776889] },
  properties: {
    osm_type: 'W',
    osm_id: 123,
    name: 'Chợ Bến Thành',
    street: 'Lê Lợi',
    district: 'Quận 1',
    city: 'Thành phố Hồ Chí Minh',
    country: 'Việt Nam',
  },
};

test('normalizes a Photon feature into exact Leaflet coordinates', () => {
  const result = normalizePhotonFeature(feature);
  assert.equal(result?.primaryText, 'Chợ Bến Thành');
  assert.deepEqual(result?.point, {
    lat: 10.776889,
    lng: 106.700806,
    address: 'Chợ Bến Thành, Lê Lợi, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
  });
});

test('rejects malformed Photon coordinates', () => {
  assert.equal(normalizePhotonFeature({ geometry: { coordinates: ['bad', null] } }), null);
});

test('invalidates a selected location after its label is edited', () => {
  const point = { lat: 10.77, lng: 106.7, address: 'Chợ Bến Thành' };
  assert.equal(isResolvedAddressValue('Chợ Bến Thành', point), true);
  assert.equal(isResolvedAddressValue('Chợ Bến Thành mới', point), false);
});

test('creates stable normalized cache keys', () => {
  assert.equal(createGeocodingCacheKey('  Chợ   Bến Thành '), 'chợ bến thành');
});
```

- [ ] **Step 2: Run the geocoding test and verify RED**

Run: `node --experimental-strip-types --test tests/geocoding.test.mts`

Expected: FAIL because `geocoding.utils.ts` does not exist.

- [ ] **Step 3: Add geocoding types and pure normalization**

Add to `trip.types.ts`:

```typescript
export interface AddressSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
  point: LocationPoint;
  osmType?: string;
  osmId?: string | number;
}
```

Implement `geocoding.utils.ts` with:

```typescript
import { AddressSuggestion, LocationPoint } from '../types/trip.types';

export function createGeocodingCacheKey(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function isResolvedAddressValue(
  query: string,
  value: LocationPoint | null,
): boolean {
  return Boolean(
    value?.address && createGeocodingCacheKey(query) === createGeocodingCacheKey(value.address),
  );
}

export function normalizePhotonFeature(feature: unknown): AddressSuggestion | null {
  // Parse only finite GeoJSON Point coordinates; combine unique address parts in Vietnamese display order.
  // Use `${osm_type}-${osm_id}` when present and a coordinate-derived id otherwise.
}
```

The production implementation must make the expected address from the test exactly, remove duplicate adjacent parts, and return `null` for any non-finite coordinate.

- [ ] **Step 4: Run the geocoding test and verify GREEN**

Run: `node --experimental-strip-types --test tests/geocoding.test.mts`

Expected: 4 tests pass.

- [ ] **Step 5: Add the abortable cached Photon client**

Implement `geocoding.service.ts` with these concrete request rules:

```typescript
const DEFAULT_BASE_URL = 'https://photon.komoot.io';
const VIETNAM_BBOX = '102.14,8.18,109.47,23.39';
const cache = new Map<string, AddressSuggestion[]>();

search(query, bias, signal):
  GET {baseUrl}/api?q={trimmed}&limit=6&lang=vi&bbox={VIETNAM_BBOX}
  append lat/lon when bias is valid
  normalize features and remove null results
  cache by normalized query plus rounded bias

reverse(point, signal):
  GET {baseUrl}/reverse?lat={lat}&lon={lng}&lang=vi
  return the first valid normalized point or null
```

Use the optional safe Vite env access below so importing pure helpers in Node remains unaffected:

```typescript
const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;
const baseUrl = viteEnv?.VITE_GEOCODING_URL || DEFAULT_BASE_URL;
```

- [ ] **Step 6: Run tests and build**

Run: `npm.cmd test`

Expected: all listed tests pass.

Run: `npm.cmd run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 7: Commit the geocoding boundary**

```bash
git add apps/frontend/src/types/trip.types.ts apps/frontend/src/utils/geocoding.utils.ts apps/frontend/src/services/geocoding.service.ts apps/frontend/tests/geocoding.test.mts
git commit -m "feat(frontend): add exact Photon address geocoding"
```

---

### Task 3: Accessible Pickup and Destination Autocomplete

**Files:**

- Create: `apps/frontend/src/components/customer/AddressAutocomplete.tsx`
- Modify: `apps/frontend/src/components/customer/BookingPanel.tsx`
- Modify: `apps/frontend/src/stores/tripStore.ts`
- Modify: `apps/frontend/src/services/trip.service.ts`
- Modify: `apps/frontend/src/types/trip.types.ts`

**Interfaces:**

- Consumes: `geocodingService.search`, `isResolvedAddressValue`, `LocationPoint | null`
- Produces: `AddressAutocomplete` with `value`, `onChange`, `bias`, `tone`, and accessible combobox props.
- Produces: route preview only for two resolved endpoints.

- [ ] **Step 1: Add the failing stale-route behavior assertion**

Extend `geocoding.test.mts`:

```typescript
test('treats coordinate labels as resolved map selections', () => {
  const point = { lat: 10.77, lng: 106.7, address: '10.77000, 106.70000' };
  assert.equal(isResolvedAddressValue('10.77000, 106.70000', point), true);
});
```

- [ ] **Step 2: Run the focused test and verify RED if normalization is incomplete**

Run: `node --experimental-strip-types --test tests/geocoding.test.mts`

Expected before adjustment: FAIL if coordinate labels are altered or rejected.

- [ ] **Step 3: Implement the reusable combobox**

`AddressAutocomplete.tsx` must implement this state machine:

```text
value changes -> synchronize visible query
typing different text -> onChange(null)
trimmed length < 3 -> clear suggestions and do not request
350 ms stable query -> abort previous request, show loading, call search
new request or unmount -> abort old request and clear timer
ArrowDown/ArrowUp -> move active option
Enter -> select active option
Escape -> close list
selection -> set exact LocationPoint and close list
```

Use `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"`, and `role="option"` rows. Every row must be at least 48 px tall. Show these exact user states:

- `Đang tìm địa chỉ…`
- `Không tìm thấy địa chỉ phù hợp`
- `Không thể tải gợi ý. Bạn vẫn có thể chọn trên bản đồ.`
- `Dữ liệu địa chỉ © OpenStreetMap`

- [ ] **Step 4: Make pickup nullable and remove silent business fallbacks**

Change `TripState.pickup` to `LocationPoint | null`, initialize/reset it to `null`, and guard every consumer. The map may retain its city-center display center, but that center must never become a selected pickup automatically.

In `trip.service.ts`, keep only fare and breakdown values actually returned by backend. Replace the synthetic breakdown with:

```typescript
breakdown: {
  originalFare: Number(data.original_fare ?? fare),
  discount: Number(data.discount_amount ?? 0),
}
```

Update `RoutePreviewData.breakdown` to the same property names. Do not compute BIKE/CAR ratios locally.

- [ ] **Step 5: Replace BookingPanel's address block**

Use two `AddressAutocomplete` instances in a connected A/B layout:

```tsx
<AddressAutocomplete
  id="pickup-address"
  label="Điểm đón"
  tone="pickup"
  value={pickup}
  onChange={setPickup}
  bias={pickup ?? dropoff}
  placeholder="Nhập điểm đón"
/>
<AddressAutocomplete
  id="dropoff-address"
  label="Điểm đến"
  tone="dropoff"
  value={dropoff}
  onChange={setDropoff}
  bias={pickup}
  placeholder="Bạn muốn đi đâu?"
/>
```

Keep GPS refresh and popular destinations. GPS success resolves pickup; permission failure leaves it unresolved and shows the existing warning. Preview effects must return early unless both `pickup` and `dropoff` exist. Use a monotonically increasing request id in a ref so an older three-fare `Promise.all` cannot overwrite a newer endpoint selection.

- [ ] **Step 6: Run tests and build**

Run: `npm.cmd test`

Expected: all tests pass.

Run: `npm.cmd run build`

Expected: no nullable-location TypeScript errors and a successful Vite build.

- [ ] **Step 7: Commit the autocomplete UI**

```bash
git add apps/frontend/src/components/customer/AddressAutocomplete.tsx apps/frontend/src/components/customer/BookingPanel.tsx apps/frontend/src/stores/tripStore.ts apps/frontend/src/services/trip.service.ts apps/frontend/src/types/trip.types.ts apps/frontend/tests/geocoding.test.mts
git commit -m "feat(frontend): add pickup and destination autocomplete"
```

---

### Task 4: Deterministic Multi-driver Fleet and 3 km Eligibility

**Files:**

- Create: `apps/frontend/src/utils/fleetSimulation.utils.ts`
- Create: `apps/frontend/tests/fleet-simulation.test.mts`
- Create: `apps/frontend/src/hooks/useFleetSimulation.ts`
- Modify: `apps/frontend/src/components/map/CrabMap.tsx`
- Modify: `apps/frontend/src/components/map/MovingVehicleMarker.tsx`
- Modify: `apps/frontend/src/pages/customer/CustomerHomePage.tsx`

**Interfaces:**

- Produces: `SimulatedDriver`, `DisplayedDriver`, `FleetEligibilityReason`
- Produces: `createSimulatedFleet(pickup): SimulatedDriver[]`
- Produces: `advanceSimulatedFleet(fleet, pickup, elapsedSeconds): DisplayedDriver[]`
- Produces: `getFleetEligibility(driver, pickup, serviceType)`
- Produces: `useFleetSimulation(pickup, serviceType, enabled)`

- [ ] **Step 1: Write failing deterministic fleet tests**

Create `fleet-simulation.test.mts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import {
  advanceSimulatedFleet,
  createSimulatedFleet,
  getFleetEligibility,
} from '../src/utils/fleetSimulation.utils.ts';

const pickup = { lat: 16.047079, lng: 108.20623, address: 'Đà Nẵng' };

test('generates near and far drivers relative to an arbitrary pickup', () => {
  const fleet = createSimulatedFleet(pickup);
  const distances = fleet.map((driver) => turf.distance(
    [pickup.lng, pickup.lat],
    [driver.lng, driver.lat],
    { units: 'meters' },
  ));
  assert.ok(distances.some((distance) => distance <= 3000));
  assert.ok(distances.some((distance) => distance > 3000));
});

test('requires both the 3 km radius and requested vehicle type', () => {
  assert.equal(getFleetEligibility(
    { id: 'near-bike', lat: pickup.lat, lng: pickup.lng, vehicleType: 'BIKE' },
    pickup,
    'BIKE',
  ).eligible, true);
  assert.equal(getFleetEligibility(
    { id: 'wrong-type', lat: pickup.lat, lng: pickup.lng, vehicleType: 'CAR_4' },
    pickup,
    'BIKE',
  ).reason, 'VEHICLE_TYPE');
  assert.equal(getFleetEligibility(
    { id: 'far-bike', lat: 16.09, lng: 108.20623, vehicleType: 'BIKE' },
    pickup,
    'BIKE',
  ).reason, 'OUT_OF_RADIUS');
});

test('advances the same fleet deterministically without random jumps', () => {
  const fleet = createSimulatedFleet(pickup);
  assert.deepEqual(
    advanceSimulatedFleet(fleet, pickup, 12),
    advanceSimulatedFleet(fleet, pickup, 12),
  );
  assert.notDeepEqual(
    advanceSimulatedFleet(fleet, pickup, 12),
    advanceSimulatedFleet(fleet, pickup, 13.2),
  );
});
```

- [ ] **Step 2: Run the fleet test and verify RED**

Run: `node --experimental-strip-types --test tests/fleet-simulation.test.mts`

Expected: FAIL because `fleetSimulation.utils.ts` does not exist.

- [ ] **Step 3: Implement deterministic fleet utilities**

Use stable templates with unique ids, vehicle types, bearings, radii, loop radii, and angular speeds. Generate coordinates with `turf.destination`, calculate distance with `turf.distance`, and calculate heading with `turf.bearing`. The templates must include:

```typescript
const FLEET_TEMPLATES = [
  { id: 'sim-bike-1', vehicleType: 'BIKE', radialKm: 0.7, bearing: 25, direction: 1 },
  { id: 'sim-bike-2', vehicleType: 'BIKE', radialKm: 3.8, bearing: 210, direction: -1 },
  { id: 'sim-car4-1', vehicleType: 'CAR_4', radialKm: 1.3, bearing: 100, direction: 1 },
  { id: 'sim-car4-2', vehicleType: 'CAR_4', radialKm: 4.6, bearing: 300, direction: -1 },
  { id: 'sim-car7-1', vehicleType: 'CAR_7', radialKm: 2.4, bearing: 165, direction: 1 },
  { id: 'sim-car7-2', vehicleType: 'CAR_7', radialKm: 5.2, bearing: 340, direction: -1 },
] as const;
```

Names and plates are presentation metadata. Coordinates must always derive from the provided pickup. `advanceSimulatedFleet` must be a pure function and must not call `Date.now` or `Math.random`.

- [ ] **Step 4: Run the fleet test and verify GREEN**

Run: `node --experimental-strip-types --test tests/fleet-simulation.test.mts`

Expected: 3 tests pass.

- [ ] **Step 5: Add lifecycle-safe simulation hook**

`useFleetSimulation` must:

- return `[]` when disabled or pickup is unresolved;
- memoize the base fleet by primitive pickup latitude/longitude;
- update elapsed time every 1,200 ms with functional state;
- return static base positions when `prefers-reduced-motion: reduce` matches;
- clear its media listener and interval on cleanup.

- [ ] **Step 6: Wire fleet display and matching radius**

In `CustomerHomePage.tsx`, delete the fixed `nearbyFleet` array and random interval. Feed `useFleetSimulation` with the current pickup and selected service. Keep the fleet visible before booking and during `FINDING_DRIVER`, hide it after assignment.

In `CrabMap.tsx`:

- render a Leaflet `Circle` with radius `3000` only for the labelled simulation;
- derive the online badge count from the displayed fleet;
- pass `eligible`, `eligibilityReason`, and `isSimulated` into `MovingVehicleMarker`;
- never use the fleet array as `driverLocation`.

Marker popups must say one of:

- `Có thể nhận cuốc mô phỏng`
- `Ngoài phạm vi 3 km`
- `Không cùng loại xe`

- [ ] **Step 7: Run tests and build**

Run: `npm.cmd test`

Expected: all frontend tests pass.

Run: `npm.cmd run build`

Expected: successful build with no fixed simulated coordinates in `CustomerHomePage.tsx`.

Run: `rg -n "Math\.random|sim-bike|10\.7838|106\.6968" apps/frontend/src/pages/customer apps/frontend/src/hooks apps/frontend/src/utils`

Expected: no `Math.random` or removed Halo fleet coordinate matches; stable ids may appear only in the fleet template utility.

- [ ] **Step 8: Commit deterministic fleet behavior**

```bash
git add apps/frontend/src/utils/fleetSimulation.utils.ts apps/frontend/tests/fleet-simulation.test.mts apps/frontend/src/hooks/useFleetSimulation.ts apps/frontend/src/components/map/CrabMap.tsx apps/frontend/src/components/map/MovingVehicleMarker.tsx apps/frontend/src/pages/customer/CustomerHomePage.tsx
git commit -m "feat(frontend): simulate eligible nearby driver fleet"
```

---

### Task 5: Smooth Assigned-driver Movement

**Files:**

- Create: `apps/frontend/src/utils/vehicleMotion.utils.ts`
- Create: `apps/frontend/tests/vehicle-motion.test.mts`
- Modify: `apps/frontend/src/components/map/MovingVehicleMarker.tsx`

**Interfaces:**

- Produces: `interpolateVehiclePosition(start, end, progress)`
- Produces: `calculateVehicleHeading(start, end, fallbackHeading)`
- Consumes: every valid Socket or simulated marker target.

- [ ] **Step 1: Write failing interpolation tests**

Create `vehicle-motion.test.mts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVehicleHeading,
  interpolateVehiclePosition,
} from '../src/utils/vehicleMotion.utils.ts';

test('interpolates a midpoint without mutating endpoints', () => {
  const start = { lat: 10, lng: 106 };
  const end = { lat: 11, lng: 108 };
  assert.deepEqual(interpolateVehiclePosition(start, end, 0.5), { lat: 10.5, lng: 107 });
  assert.deepEqual(start, { lat: 10, lng: 106 });
});

test('clamps interpolation progress', () => {
  const start = { lat: 10, lng: 106 };
  const end = { lat: 11, lng: 108 };
  assert.deepEqual(interpolateVehiclePosition(start, end, -1), start);
  assert.deepEqual(interpolateVehiclePosition(start, end, 2), end);
});

test('computes a finite heading and preserves fallback for a stationary point', () => {
  assert.ok(Number.isFinite(calculateVehicleHeading(
    { lat: 10, lng: 106 },
    { lat: 10.1, lng: 106.1 },
    45,
  )));
  assert.equal(calculateVehicleHeading(
    { lat: 10, lng: 106 },
    { lat: 10, lng: 106 },
    45,
  ), 45);
});
```

- [ ] **Step 2: Run the motion test and verify RED**

Run: `node --experimental-strip-types --test tests/vehicle-motion.test.mts`

Expected: FAIL because `vehicleMotion.utils.ts` does not exist.

- [ ] **Step 3: Implement pure interpolation and heading**

Use clamped linear coordinate interpolation and Turf bearing. Return the supplied fallback when the two coordinates are equal or Turf returns a non-finite value.

- [ ] **Step 4: Run the motion test and verify GREEN**

Run: `node --experimental-strip-types --test tests/vehicle-motion.test.mts`

Expected: 3 tests pass.

- [ ] **Step 5: Refactor MovingVehicleMarker to imperative animation**

Use a Leaflet marker ref and this lifecycle:

```text
new valid target -> cancel previous animation frame
reduced motion -> setLatLng(target) immediately
normal motion -> interpolate previous rendered point to target over 1,200 ms
each frame -> marker.setLatLng([lat, lng])
completion -> store exact target as previous point
unmount -> cancel animation frame
```

Memoize the `L.divIcon` by primitive visual inputs. Rotate the icon using the target heading or computed bearing. Animate only transform/opacity in CSS.

- [ ] **Step 6: Run the full verification**

Run: `npm.cmd test`

Expected: all frontend tests pass.

Run: `npm.cmd run build`

Expected: successful build.

- [ ] **Step 7: Commit marker interpolation**

```bash
git add apps/frontend/src/utils/vehicleMotion.utils.ts apps/frontend/tests/vehicle-motion.test.mts apps/frontend/src/components/map/MovingVehicleMarker.tsx
git commit -m "feat(frontend): interpolate live vehicle markers"
```

---

### Task 6: Resilient Cancellation and Competing Accept UI

**Files:**

- Modify: `apps/frontend/src/components/customer/TripBottomSheet.tsx`
- Modify: `apps/frontend/src/pages/customer/CustomerHomePage.tsx`
- Modify: `apps/frontend/src/components/driver/TripOfferModal.tsx`
- Modify: `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`
- Modify: `apps/frontend/tests/trip-rules.test.mts`

**Interfaces:**

- Consumes: `canCustomerCancel`, `isTripAcceptConflict`, `getTripAcceptErrorMessage`
- Produces: one in-flight cancel or accept request per UI surface.

- [ ] **Step 1: Extend failing error-preservation tests**

Add pure decision coverage to `trip-rules.test.mts`:

```typescript
test('keeps a non-conflict offer available for retry', () => {
  const serverError = { response: { status: 500 } };
  assert.equal(isTripAcceptConflict(serverError), false);
  assert.match(getTripAcceptErrorMessage(serverError), /thử lại/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED if generic copy is incomplete**

Run: `node --experimental-strip-types --test tests/trip-rules.test.mts`

Expected: FAIL until the generic retry copy matches the rule.

- [ ] **Step 3: Wire cancellation guard and request state**

`TripBottomSheet` receives `isCancelling`. It must render the cancel action only from the shared rule, disable and show loading while the request is active, and explain that cancellation is unavailable once the driver has arrived.

`CustomerHomePage` keeps the existing safe order:

```text
lock request -> await POST cancel -> reset only on success -> unlock in finally
```

If the API fails, preserve `activeTrip`, pickup, dropoff, route, and assigned driver state.

- [ ] **Step 4: Centralize competing accept handling**

`TripOfferModal` owns only countdown and one-submit locking. It must check `isAccepting` before invoking the callback and disable both actions during acceptance.

`DriverDashboardPage.handleAcceptOffer` owns API outcome handling:

```text
success -> load trip, close offer, set active id, join room, show success
409 -> close only the matching offer, show friendly conflict message, remain online
other error -> keep offer if its TTL is still valid, show retry message, remain online
```

Remove the modal's second API-error toast path so one failure produces one message.

- [ ] **Step 5: Run tests and build**

Run: `npm.cmd test`

Expected: all frontend tests pass.

Run: `npm.cmd run build`

Expected: successful build.

- [ ] **Step 6: Commit resilient trip actions**

```bash
git add apps/frontend/src/components/customer/TripBottomSheet.tsx apps/frontend/src/pages/customer/CustomerHomePage.tsx apps/frontend/src/components/driver/TripOfferModal.tsx apps/frontend/src/pages/driver/DriverDashboardPage.tsx apps/frontend/tests/trip-rules.test.mts
git commit -m "fix(frontend): harden trip accept and cancellation UI"
```

---

### Task 7: Visual Polish, Browser QA, and Tracking Evidence

**Files:**

- Modify: `apps/frontend/src/index.css`
- Modify: `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`
- Modify: `apps/frontend/ISSUES-LIST-TRACKING.md`
- Modify: `BUG-TRACKING.md`

**Interfaces:**

- Consumes: completed feature behavior from Tasks 1–6.
- Produces: responsive and accessibility evidence plus explicit backend follow-up items.

- [ ] **Step 1: Apply the frontend design and mobile rules**

Add only focused CSS needed by the approved design:

- paired A/B address connector;
- active suggestion row and keyboard focus;
- eligibility and neutral marker treatments;
- `padding-bottom: env(safe-area-inset-bottom, 16px)` on the mobile booking surface;
- `overscroll-behavior: none` for the map stage;
- reduced-motion behavior that removes radar/marker ambient loops.

Do not introduce a new palette or unrelated restyling.

- [ ] **Step 2: Run final automated verification**

Run: `npm.cmd test` in `apps/frontend`.

Expected: every auth, trip-rule, geocoding, fleet, and motion test passes.

Run: `npm.cmd run build` in `apps/frontend`.

Expected: TypeScript and Vite build pass. Record the existing chunk-size warning separately if it remains.

Run: `npm.cmd run build` in `apps/backend`.

Expected: build evidence only; do not change backend.

Run: `npm.cmd test -- --runInBand` in `apps/backend`.

Expected baseline as of 2026-08-21: 13 suites fail and 1 passes because scaffold tests omit required providers and one tracking spec has an invalid relative import. Record the current result in `BUG-TRACKING.md`; do not fix it.

- [ ] **Step 3: Load the browser QA workflow before browser commands**

Run:

```bash
agent-browser skills get core
agent-browser skills get dogfood
```

Follow the returned version-specific workflow. Start Vite with a hidden/background process and open the app in a named browser session.

- [ ] **Step 4: Verify customer autocomplete and responsive layouts**

At 375 px, 768 px, and 1440 px widths verify:

- pickup and destination fields are both editable;
- a typed query shows Photon suggestions and selecting one updates the marker;
- editing a selected label disables preview/booking until reselection;
- keyboard Arrow/Enter/Escape works;
- GPS denial leaves the pickup unresolved;
- map click/drag uses reverse lookup or a valid coordinate label;
- suggestion list is not clipped by the map or panel;
- all primary controls meet the 48 px target.

Capture screenshots at the three widths for evidence.

- [ ] **Step 5: Verify fleet and trip edge cases**

Verify in the browser:

- near and far drivers are relative to the chosen pickup;
- the 3 km boundary is visible and type/radius reasons are correct;
- deterministic vehicles move smoothly without sudden random jumps;
- the simulated fleet is labelled and never changes real trip state;
- an accepted driver's real marker follows Socket telemetry when backend supplies it;
- repeated cancel clicks produce one request;
- failed cancellation preserves the trip;
- independent driver sessions do not share authentication state;
- a losing `409` accept closes only the stale offer and leaves the driver online.

If the backend environment cannot supply real tokens, drivers, or concurrent requests, record that integration-test requirement as open in `BUG-TRACKING.md` and retain the passing frontend rule tests as frontend evidence.

- [ ] **Step 6: Record backend follow-up without backend edits**

Add dated open rows for verified backend findings, including only findings reproduced from source/build/test evidence:

- backend Jest suite is not a usable regression gate;
- simulator accesses a driver repository member that `DriversService` does not expose under that name;
- customer cancellation implementation permits states beyond the documented `FINDING_DRIVER`/`ACCEPTED` rule;
- a read-only nearby-driver telemetry/API capability is required if product wants the customer fleet map to show real rather than labelled simulated drivers.

Use `BUG-*` for defects and `REQ-BE-*` for missing capabilities.

- [ ] **Step 7: Update frontend tracking**

Append a Phase 12 section to the frontend development log with checked items for:

- paired exact autocomplete;
- deterministic multi-driver simulation;
- 3 km/type visual eligibility;
- Turf/RAF movement interpolation;
- competing accept and cancellation tests;
- responsive/browser evidence;
- build and test commands with exact pass counts.

Add resolved frontend issue rows for stale typed coordinates, fixed random fleet positions, jumpy marker movement, and duplicated/inconsistent trip action behavior.

- [ ] **Step 8: Run repository hygiene checks**

Run:

```bash
git diff --check
rg -n "console\.log|Math\.random" apps/frontend/src
git status --short
```

Expected: no whitespace errors, no added debug logging, no fleet randomness, and no modified file under `apps/backend/`.

- [ ] **Step 9: Commit verification and tracking evidence**

```bash
git add apps/frontend/src/index.css apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md apps/frontend/ISSUES-LIST-TRACKING.md BUG-TRACKING.md
git commit -m "docs: record booking flow verification evidence"
```

---

## Plan Self-review Result

- Every approved spec requirement maps to Tasks 2–7.
- Backend source remains excluded from every edit and commit command.
- The pure interfaces used by later tasks are defined in the earlier task that creates them.
- Every production behavior begins with a focused failing test or reuses an already-failing assertion from the same task.
- Browser-only behavior has explicit viewport, keyboard, cancellation, concurrency, and fallback checks.
- Backend failures are documented as open follow-up rather than repaired or reported as frontend success.
