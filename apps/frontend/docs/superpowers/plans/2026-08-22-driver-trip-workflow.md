# Driver Trip Workflow Implementation Plan

> **For agentic workers:** Executed inline in this session. Steps use checkbox syntax for tracking.

**Goal:** Limit simulated driver movement, repair customer wait-time display, and render all concurrent driver offers received under the existing Socket.io contract.

**Architecture:** Pure utilities own status-free simulation plans, wait-time calculation, and offer collection operations. React components consume those utilities while Zustand owns the live driver offer collection. No backend endpoint, socket event, or payload changes.

**Tech Stack:** React 18, TypeScript, Zustand, Socket.io client, Node test runner, Tailwind CSS.

## Global Constraints

- Modify only `apps/frontend/`.
- Preserve the existing `driver:trip_offer` event and backend-owned 3 km matching / 409 lock behavior.
- Keep all non-movement trip statuses manually controlled by the Driver UI.
- Use tests before production code and verify each new behavior against independent literal expectations.

---

### Task 1: Restrict driver simulation to vehicle location

**Files:**
- Modify: `apps/frontend/tests/driver-trip-simulation.test.mts`
- Modify: `apps/frontend/src/utils/driverTripSimulation.utils.ts`
- Modify: `apps/frontend/src/components/driver/DriverTripSimulator.tsx`
- Modify: `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`

**Interfaces:**
- Consumes: `TripStatus`, `DriverLocationUpdatePayload`, and current map location.
- Produces: `createDriverTripSimulationPlan(input): DriverSimulationAction[]` with only `LOCATION` actions for `ACCEPTED` and `IN_TRANSIT`; `runDriverTripSimulationPlan(actions, options)` invokes only `onLocation`.

- [x] **Step 1: Write the failing tests**

```ts
assert.deepEqual(
  createPlan({
    tripId: 'trip-manual',
    status: 'ARRIVED_AT_PICKUP',
    currentLocation: { lat: 10.79, lng: 106.71 },
    pickup,
    dropoff,
    stepsPerLeg: 2,
  }),
  [],
);
assert.deepEqual(observedStatuses, []);
```

- [x] **Step 2: Run the simulator test to verify it fails**

Run: `npm test -- tests/driver-trip-simulation.test.mts`
Expected: the existing full-state simulation emits status actions, contradicting the location-only requirement.

- [x] **Step 3: Implement the minimal location-only plan**

```ts
if (status === 'ACCEPTED') {
  return createLocationActions(tripId, currentLocation, pickup, 'TO_PICKUP', safeStepsPerLeg);
}
if (status === 'IN_TRANSIT') {
  return createRouteLocationActions(
    tripId,
    currentLocation,
    dropoff,
    'TO_DROPOFF',
    safeStepsPerLeg,
    dropoffRoute,
  );
}
return [];
```

Remove the simulator status callback and completion reset. Keep the existing manual Driver status button as the only transition path.

- [x] **Step 4: Run the simulator test to verify it passes**

Run: `npm test -- tests/driver-trip-simulation.test.mts`
Expected: PASS with only location payloads and no automatic trip status request.

### Task 2: Derive the customer search timer from trip creation time

**Files:**
- Create: `apps/frontend/tests/trip-waiting-time.test.mts`
- Create: `apps/frontend/src/utils/tripWaitingTime.utils.ts`
- Modify: `apps/frontend/src/components/customer/FindingRadarModal.tsx`
- Modify: `apps/frontend/src/pages/customer/CustomerHomePage.tsx`

**Interfaces:**
- Consumes: `Trip.created_at` and an epoch-millisecond clock.
- Produces: `getTripSearchElapsedSeconds(createdAt, nowMs): number` and `FindingRadarModal.createdAt?: string`.

- [x] **Step 1: Write the failing tests**

```ts
assert.equal(getTripSearchElapsedSeconds('2026-08-22T10:00:00.000Z', fixedNow), 70);
assert.deepEqual([firstWait, secondWait], [20, 95]);
```

- [x] **Step 2: Run the wait-time test to verify it fails**

Run: `npm test -- tests/trip-waiting-time.test.mts`
Expected: module import fails because the time-derived utility does not exist.

- [x] **Step 3: Implement the minimal time utility and connect it to the modal**

```ts
const searchSeconds = getTripSearchElapsedSeconds(createdAt, nowMs);
```

Update `nowMs` every second. Pass `activeTrip?.created_at` from the customer page. Invalid timestamps yield zero, not a fabricated past value.

- [x] **Step 4: Run the wait-time test to verify it passes**

Run: `npm test -- tests/trip-waiting-time.test.mts`
Expected: PASS with independent elapsed values for two customer trips.

### Task 3: Preserve and display concurrent driver offers

**Files:**
- Create: `apps/frontend/tests/trip-offer-queue.test.mts`
- Create: `apps/frontend/src/utils/tripOfferQueue.utils.ts`
- Modify: `apps/frontend/src/stores/driverStore.ts`
- Modify: `apps/frontend/src/components/driver/TripOfferModal.tsx`
- Modify: `apps/frontend/src/pages/driver/DriverDashboardPage.tsx`

**Interfaces:**
- Consumes: `DriverTripOfferPayload` from `driver:trip_offer`.
- Produces: `queueTripOffer`, `removeTripOffer`, `getRemainingOfferSeconds`, plus driver-store queue actions.

- [x] **Step 1: Write the failing tests**

```ts
assert.deepEqual(queueTripOffer([offerA], offerB).map(({ tripId }) => tripId), ['trip-a', 'trip-b']);
assert.deepEqual(removeTripOffer([offerA, offerB], 'trip-a').map(({ tripId }) => tripId), ['trip-b']);
```

- [x] **Step 2: Run the offer-queue test to verify it fails**

Run: `npm test -- tests/trip-offer-queue.test.mts`
Expected: module import fails because the queue utility does not exist.

- [x] **Step 3: Implement the minimal queue and UI wiring**

```ts
queueIncomingOffer: (offer) => set((state) => ({
  incomingOffers: queueTripOffer(state.incomingOffers, offer),
})),
```

Render one compact card per offer. Decline/conflict/cancellation removes only its `tripId`; successful accept clears the list because this driver becomes busy.

- [x] **Step 4: Run the offer-queue test to verify it passes**

Run: `npm test -- tests/trip-offer-queue.test.mts`
Expected: PASS with distinct trips preserved, duplicate events replaced, and targeted removal.

### Task 4: Verify and record frontend evidence

**Files:**
- Modify: `apps/frontend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`
- Modify: `apps/frontend/ISSUES-LIST-TRACKING.md`

- [x] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all frontend tests pass.

- [x] **Step 2: Run the production build**

Run: `npm run build`
Expected: TypeScript and Vite build pass.

- [x] **Step 3: Record results**

Add a completed frontend task entry and a resolved issue entry with the exact verification result. Do not edit root or backend documentation.
