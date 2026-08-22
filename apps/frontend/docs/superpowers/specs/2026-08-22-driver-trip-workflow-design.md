# Driver Trip Workflow Design

**Goal:** Make the frontend present independent customer wait times, retain every eligible trip offer sent to a driver, and constrain the developer trip simulator to location-only movement in exactly two ride phases.

## Scope and constraints

- Change only files inside `apps/frontend/`.
- Keep the existing REST and Socket.io contracts unchanged.
- `driver:trip_offer` is the frontend source for offers already selected by the backend's 3 km matching rule.
- A trip status changes only when the driver uses the existing manual status control.

## Design

### Movement simulation

The simulator consumes an `ACCEPTED` trip to animate the vehicle from its current position to pickup, or an `IN_TRANSIT` trip to animate it from its current position to dropoff. It emits only location payloads. It never emits `ARRIVED_AT_PICKUP`, `IN_TRANSIT`, `ARRIVED_AT_DESTINATION`, or `COMPLETED`; the driver control remains responsible for all four status changes.

The simulator is unavailable for every other trip status. On completion it leaves the trip active and explains which manual action the driver must choose next.

### Customer wait time

The finding-driver modal derives elapsed seconds from the active trip's `created_at` and the current clock. The render updates once a second without maintaining a reset-prone counter. Invalid or absent server time resolves to zero seconds rather than inventing an earlier timestamp.

### Concurrent offers

The driver store holds an ordered, de-duplicated collection of `DriverTripOfferPayload` values keyed by `tripId`. The offer modal renders the collection, calculates each TTL from `expiredAt`, and removes only the relevant offer on expiry, decline, 409 conflict, or cancellation socket event. A successful accept clears the remaining offers because the driver now has an active trip.

Two customers at the same pickup location remain two independent offers because identity is `tripId`, not coordinates. The frontend cannot decide matching eligibility: it displays every offer broadcast by the backend, whose contract owns the 3 km PostGIS filter and the single-winner accept lock.

## Verification

- Pure regression tests prove only `ACCEPTED` and `IN_TRANSIT` create movement actions; running an action plan never calls a status handler.
- Pure regression tests prove a wait duration is calculated independently for two trip creation timestamps.
- Pure regression tests prove offer queueing retains two different trip IDs, replaces duplicate events, removes one selected offer, and expires only the matching offer.
- Run the frontend test suite and production build.
