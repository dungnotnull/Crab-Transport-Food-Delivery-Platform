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
  assert.deepEqual(new Set(fleet.map((driver) => driver.vehicleType)), new Set([
    'BIKE',
    'CAR_4',
    'CAR_7',
  ]));
});

test('requires both the 3 km radius and requested vehicle type', () => {
  assert.deepEqual(
    getFleetEligibility(
      { id: 'near-bike', lat: pickup.lat, lng: pickup.lng, vehicleType: 'BIKE' },
      pickup,
      'BIKE',
    ),
    { eligible: true, reason: 'ELIGIBLE', distanceMeters: 0 },
  );
  assert.equal(
    getFleetEligibility(
      { id: 'wrong-type', lat: pickup.lat, lng: pickup.lng, vehicleType: 'CAR_4' },
      pickup,
      'BIKE',
    ).reason,
    'VEHICLE_TYPE',
  );
  assert.equal(
    getFleetEligibility(
      { id: 'far-bike', lat: 16.09, lng: 108.20623, vehicleType: 'BIKE' },
      pickup,
      'BIKE',
    ).reason,
    'OUT_OF_RADIUS',
  );
});

test('includes a driver exactly on the 3 km boundary', () => {
  const boundaryPoint = turf.destination(
    [pickup.lng, pickup.lat],
    3,
    90,
    { units: 'kilometers' },
  ).geometry.coordinates;

  const result = getFleetEligibility(
    {
      id: 'boundary-car',
      lat: boundaryPoint[1],
      lng: boundaryPoint[0],
      vehicleType: 'CAR_4',
    },
    pickup,
    'CAR_4',
  );

  assert.equal(result.eligible, true);
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
