import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateCustomerActiveTrip } from '../src/utils/customerTripHydration.utils.ts';

const trip = {
  id: 'trip-current-user',
  status: 'FINDING_DRIVER' as const,
  pickup_location: { lat: 10.77, lng: 106.69 },
  dropoff_location: { lat: 10.78, lng: 106.7 },
  total_fare: 34000,
  service_type: 'CAR_4' as const,
  payment_method: 'CASH' as const,
};

test('clears a stale customer trip when the active-trip API response is empty', () => {
  let emptyCalls = 0;
  let restoredTrip: unknown = null;

  const restored = hydrateCustomerActiveTrip(null, {
    onEmpty: () => {
      emptyCalls += 1;
    },
    onActive: (activeTrip) => {
      restoredTrip = activeTrip;
    },
  });

  assert.equal(restored, false);
  assert.equal(emptyCalls, 1);
  assert.equal(restoredTrip, null);
});

test('restores only the trip returned by the active-trip API', () => {
  let emptyCalls = 0;
  let restoredTrip: unknown = null;

  const restored = hydrateCustomerActiveTrip(trip, {
    onEmpty: () => {
      emptyCalls += 1;
    },
    onActive: (activeTrip) => {
      restoredTrip = activeTrip;
    },
  });

  assert.equal(restored, true);
  assert.equal(emptyCalls, 0);
  assert.equal(restoredTrip, trip);
});
