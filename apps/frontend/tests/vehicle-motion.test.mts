import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVehicleHeading,
  interpolateVehiclePosition,
} from '../src/utils/vehicleMotion.utils.ts';

test('interpolates the midpoint without mutating either endpoint', () => {
  const start = { lat: 10, lng: 106 };
  const end = { lat: 12, lng: 110 };

  const midpoint = interpolateVehiclePosition(start, end, 0.5);

  assert.deepEqual(midpoint, { lat: 11, lng: 108 });
  assert.deepEqual(start, { lat: 10, lng: 106 });
  assert.deepEqual(end, { lat: 12, lng: 110 });
});

test('clamps animation progress to the valid zero-to-one range', () => {
  const start = { lat: 10, lng: 106 };
  const end = { lat: 12, lng: 110 };

  assert.deepEqual(interpolateVehiclePosition(start, end, -2), start);
  assert.deepEqual(interpolateVehiclePosition(start, end, 3), end);
});

test('always returns a finite heading and preserves the fallback while stationary', () => {
  const movingHeading = calculateVehicleHeading(
    { lat: 10, lng: 106 },
    { lat: 10.01, lng: 106.02 },
    25,
  );
  const stationaryHeading = calculateVehicleHeading(
    { lat: 10, lng: 106 },
    { lat: 10, lng: 106 },
    25,
  );

  assert.equal(Number.isFinite(movingHeading), true);
  assert.ok(movingHeading >= 0 && movingHeading < 360);
  assert.equal(stationaryHeading, 25);
});
