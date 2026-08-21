import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLocationPoint,
  normalizeTrip,
} from '../src/utils/tripNormalization.utils.ts';

test('normalizes backend GeoJSON coordinates without changing longitude order', () => {
  assert.deepEqual(
    normalizeLocationPoint(
      { type: 'Point', coordinates: [106.700806, 10.776889] },
      'Điểm đón',
    ),
    { lat: 10.776889, lng: 106.700806, address: '10.7769, 106.7008' },
  );
});

test('rejects a missing or malformed location instead of inventing coordinates', () => {
  assert.throws(() => normalizeLocationPoint(null, 'Điểm đón'), /tọa độ/i);
  assert.throws(
    () => normalizeLocationPoint({ coordinates: ['bad', null] }, 'Điểm đến'),
    /tọa độ/i,
  );
});

test('rejects a trip with an invalid endpoint', () => {
  assert.throws(
    () => normalizeTrip({
      id: 'trip-invalid',
      pickup_location: null,
      dropoff_location: { lat: 10.78, lng: 106.7 },
    }),
    /tọa độ/i,
  );
});
