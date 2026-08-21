# Ride Booking Autocomplete and Fleet Simulation Design

## Context

The Crab customer booking flow currently displays a map and allows a destination to be typed, but typed text is paired with an old or fallback coordinate until the customer selects a preset or clicks the map. The pickup is not editable as an address. The nearby fleet is a fixed list around Halo Building and moves with `Math.random`, so it does not follow the customer's selected pickup or expose the backend's 3 km matching boundary clearly. The assigned vehicle marker also jumps directly between Socket.io telemetry points instead of interpolating its movement.

This change is frontend-only. No file under `apps/backend/` may be modified. Backend defects and missing backend capabilities discovered during implementation or verification must be recorded in the root `BUG-TRACKING.md` for the backend team.

## Goals

1. Let a customer enter both pickup and destination in a Grab-like paired address control.
2. Show address suggestions that resolve to exact coordinates before route preview or booking is allowed.
3. Animate vehicle markers smoothly and provide a clearly labelled development fleet simulation.
4. Demonstrate multiple drivers distributed around the selected pickup while mirroring the backend eligibility rules that the frontend can know: within 3 km and matching the requested vehicle type.
5. Verify frontend behavior for competing accepts, customer cancellation, stale requests, and API failures without changing backend logic.

## Non-goals

- The frontend does not decide which real driver receives a trip. PostGIS matching and trip locking remain backend responsibilities.
- The frontend simulation does not create drivers, accept trips, mutate trip status, or replace Socket.io telemetry for an accepted trip.
- This change does not introduce a production SLA for the public geocoder demo endpoint.
- This change does not add or modify backend endpoints, entities, services, tests, or configuration.

## Chosen Approach

Use a modular frontend implementation with four boundaries:

1. A geocoding service normalizes Photon GeoJSON results into Crab `LocationPoint` values and supports forward and reverse lookup.
2. A reusable address autocomplete component owns query, suggestion, keyboard, loading, and error presentation for either endpoint.
3. Pure fleet simulation utilities generate deterministic positions relative to the selected pickup and calculate visual eligibility without affecting backend dispatch.
4. Pure trip UI rules define cancellation availability and acceptance-conflict messages so edge cases can be tested independently of React rendering.

The Photon base URL is read from `VITE_GEOCODING_URL` and defaults to `https://photon.komoot.io`. Requests are debounced, cancellable, cached in memory, biased toward the active pickup or map center, limited to Vietnam, and capped to a small result set. The UI identifies OpenStreetMap as the address-data source. The public Nominatim service is not used because its usage policy forbids client-side autocomplete.

## Architecture and File Responsibilities

### New files

- `apps/frontend/src/services/geocoding.service.ts`
  - Builds forward and reverse Photon requests.
  - Normalizes GeoJSON features into stable suggestion objects.
  - Applies an in-memory cache and accepts `AbortSignal` for stale-request cancellation.
- `apps/frontend/src/components/customer/AddressAutocomplete.tsx`
  - Renders one accessible combobox for pickup or destination.
  - Keeps typed text separate from a resolved `LocationPoint`.
  - Supports Arrow Up/Down, Enter, Escape, pointer selection, loading, empty, and error states.
- `apps/frontend/src/utils/fleetSimulation.utils.ts`
  - Generates a deterministic development fleet from the current pickup using bearings and distances rather than fixed coordinates.
  - Calculates distance and visual eligibility using the same 3,000 m boundary and vehicle-type equality documented by the backend.
  - Advances vehicles along small deterministic loops without random jumps.
- `apps/frontend/src/hooks/useFleetSimulation.ts`
  - Owns the animation clock and returns display-only simulated driver positions.
  - Stops timers on unmount and respects reduced motion.
- `apps/frontend/src/utils/tripRules.ts`
  - Exposes customer cancellation guards and consistent accept-conflict messaging.
- Focused Node test files under `apps/frontend/tests/` for geocoding normalization, fleet eligibility/movement, and trip UI rules.

### Modified files

- `apps/frontend/src/components/customer/BookingPanel.tsx`
  - Replaces the destination-only text field with paired pickup and destination autocomplete controls.
  - Requires two resolved locations before preview and booking.
  - Preserves GPS refresh and popular destination shortcuts.
- `apps/frontend/src/pages/customer/CustomerHomePage.tsx`
  - Removes fixed Halo fleet data and `Math.random` movement.
  - Connects the simulation hook to the selected pickup and requested service.
  - Uses cancellation guards and retains the current trip when cancellation fails.
- `apps/frontend/src/components/map/CrabMap.tsx`
  - Displays simulated fleet metadata without treating simulated drivers as assigned drivers.
  - Keeps real assigned-driver telemetry visually distinct.
- `apps/frontend/src/components/map/MovingVehicleMarker.tsx`
  - Interpolates between incoming positions over approximately 1.2 seconds with Turf.js and `requestAnimationFrame`.
  - Cancels animation frames on replacement/unmount and rotates to the computed bearing.
- `apps/frontend/src/components/customer/TripBottomSheet.tsx`
  - Uses the shared cancellation rule and displays the correct disabled explanation.
- `apps/frontend/src/components/driver/TripOfferModal.tsx` and `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`
  - Share conflict handling, prevent repeated accept submission, and close stale offers after a `409` or cancellation event.
- `apps/frontend/src/stores/tripStore.ts`
  - Represents unresolved pickup/destination safely and avoids making a hardcoded business location look selected.
- `apps/frontend/src/types/trip.types.ts` and `apps/frontend/src/types/socket.types.ts`
  - Add only frontend types required for normalized suggestions and marker metadata; REST and Socket payload names remain compatible with `API-CONTRACT.md`.
- `apps/frontend/package.json`
  - Extends the existing Node test command to run all focused frontend tests.
- `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`
  - Adds a new completed phase with exact verification evidence after implementation passes.
- `apps/frontend/ISSUES-LIST-TRACKING.md`
  - Records and resolves frontend issues discovered during the work.
- `BUG-TRACKING.md`
  - Records backend defects or requests only; it does not claim they were fixed by this frontend task.

## Address Selection Data Flow

1. GPS attempts to resolve the initial pickup. Permission denial leaves the pickup unresolved while the map uses its existing city-center display fallback; the fallback is not silently submitted as the customer's pickup.
2. Typing at least three trimmed characters starts a debounced lookup. A new query aborts the previous request.
3. Suggestions show a primary place name and a secondary administrative address. Selecting one stores its exact latitude, longitude, and display address.
4. Editing a previously selected value makes that endpoint unresolved until another suggestion, GPS result, preset, or map point is selected. This prevents a new label from being booked with stale coordinates.
5. Selecting or dragging a map marker immediately updates coordinates and starts a reverse lookup. If reverse lookup fails, the coordinate label remains valid and bookable.
6. Route previews run only when both endpoints are resolved. Existing parallel fare preview calls remain, but stale results must not overwrite a newer endpoint selection.

## Fleet Simulation and Matching Representation

The development fleet is generated from the current pickup, not from Halo Building. Stable driver identities are assigned a vehicle type, bearing, radial distance, loop direction, display name, and plate. At least two simulated drivers are within 3 km and at least two are beyond 3 km so the boundary is visible in every scenario.

`isVisuallyEligible` is true only when:

- distance from the current pickup is less than or equal to 3,000 m; and
- the simulated driver's vehicle type equals the selected service type.

Eligible drivers receive a subtle Crab-green availability treatment. Ineligible drivers remain visible with neutral styling and an explanatory popup such as “Ngoài phạm vi 3 km” or “Không cùng loại xe.” When a real trip enters `FINDING_DRIVER`, this remains an explanatory visualization; actual offer delivery is observed only through backend Socket.io events. Once the trip is accepted, the simulated fleet is hidden and the assigned driver marker is driven only by `trip:location_stream`.

Vehicle movement uses deterministic loop progress. Motion updates animate only `transform` and opacity where possible, pauses under reduced-motion preferences, and cleans up every interval and animation frame.

## Cancellation and Competing Accept Behavior

Customer cancellation is enabled only for `FINDING_DRIVER` and `ACCEPTED`. The button is locked during the request. A successful response clears booking state; a failed response preserves the active trip and shows the backend message. States at or after `ARRIVED_AT_PICKUP` remain disabled even if the current backend implementation is more permissive; the mismatch is logged for backend correction.

A driver offer can submit acceptance once. HTTP `409` is treated as an expected race outcome: the stale offer closes, the driver returns to the waiting state, and a friendly message explains that another driver accepted first. Other errors close neither unrelated trip state nor the driver's online session. The frontend test proves this state handling; the database guarantee itself must be verified by backend integration tests and is logged if the existing backend suite cannot prove it.

## UI and Responsive Design

The existing Crab palette remains the source of truth. The paired address control is the signature interaction: green A and red B anchors are connected by a quiet vertical route line, with a swap-free layout that stays familiar to ride-hailing users. Suggestions open as a crisp white list with one highlighted active row, restrained shadows, and no decorative elements unrelated to selection.

- Mobile, 360–430 px: map remains full-screen; the booking surface uses the lower thumb zone with 48 px minimum interactive targets and safe-area padding.
- Tablet: booking surface and map use a split layout without covering suggestions.
- Desktop: the existing left control rail remains, while the map displays the fleet boundary and marker states clearly.
- Focus indicators, combobox semantics, live status messages, and `prefers-reduced-motion` are mandatory.

## Error Handling

- Geocoder unavailable: retain current resolved endpoints, show a concise retry message, and keep presets/map selection available.
- No suggestions: show “Không tìm thấy địa chỉ phù hợp” without inventing coordinates.
- Reverse geocoder unavailable: keep coordinates and use a formatted coordinate label.
- Route preview failure: do not enable booking and do not substitute a locally calculated fare.
- Socket disconnect: preserve the active trip and existing connection recovery behavior.
- Invalid telemetry: ignore the point and retain the last valid marker position.
- Backend contract mismatch or backend test failure: add an open item to `BUG-TRACKING.md`; do not patch backend source.

## Testing and Verification

TDD is required for all production behavior introduced by this change.

Automated frontend tests cover:

- Photon feature normalization and malformed result rejection.
- Debounced/cancelled lookup helpers and cache keys where implemented as pure behavior.
- Resolved-address invalidation after editing.
- Deterministic fleet generation from arbitrary pickup coordinates.
- Exact 3 km boundary, outside-radius exclusion, and vehicle-type exclusion.
- Deterministic movement without `Math.random` and stable headings.
- Customer cancellation matrix across every frontend trip status.
- Failed cancellation preserving active state.
- Accept submission lock and expected `409` UI outcome through extracted controller rules.

Verification commands:

- `npm.cmd test` in `apps/frontend`.
- `npm.cmd run build` in `apps/frontend`.
- Existing backend tests and build may be run read-only to collect evidence, but failures are logged rather than fixed.
- Browser QA uses independent sessions for one customer and multiple drivers, then checks pickup/destination autocomplete, route preview, simulated fleet boundary, accepted-driver movement, competing accept behavior, and cancellation.
- Responsive browser checks run at 375 px, 768 px, and 1440 px widths.

## Acceptance Criteria

- Both pickup and destination accept text and require an exact selected suggestion or map/GPS coordinate.
- Suggestions show loading, success, empty, error, mouse, touch, and keyboard states.
- Typing text cannot silently reuse stale coordinates.
- Route preview and booking are disabled until both endpoints resolve.
- The development fleet follows the selected pickup, contains near and far drivers, moves smoothly, and clearly labels simulated state.
- Only simulated drivers within 3 km and matching the selected vehicle type receive eligible styling.
- Real driver dispatch remains backend-controlled, and an accepted driver's marker follows only Socket telemetry.
- Customer cancellation and `409` conflict behaviors are covered by passing frontend tests.
- Frontend test and production build pass; responsive browser evidence is collected.
- Frontend tracking documents are updated, and every discovered backend problem is recorded in `BUG-TRACKING.md` without editing `apps/backend/`.
