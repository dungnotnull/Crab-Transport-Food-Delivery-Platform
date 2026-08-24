import test from 'node:test';
import assert from 'node:assert/strict';
import type { DriverTripOfferPayload } from '../src/types/socket.types.ts';
import {
  queueTripOffer,
  removeTripOffer,
  getRemainingOfferSeconds,
  isOfferExpired,
} from '../src/utils/tripOfferQueue.utils.ts';

const offerA: DriverTripOfferPayload = {
  tripId: 'trip-a',
  pickup: { lat: 10.77, lng: 106.7, address: 'Điểm đón A' },
  dropoff: { lat: 10.78, lng: 106.71, address: 'Điểm đến A' },
  fare: 25000,
  expiredAt: '2026-08-22T10:00:30.000Z',
};

const offerB: DriverTripOfferPayload = {
  tripId: 'trip-b',
  pickup: { lat: 10.77, lng: 106.7, address: 'Điểm đón B' },
  dropoff: { lat: 10.79, lng: 106.72, address: 'Điểm đến B' },
  fare: 31000,
  expiredAt: '2026-08-22T10:00:45.000Z',
};

test('retains every distinct simultaneous trip offer for the driver', () => {
  assert.deepEqual(
    queueTripOffer(queueTripOffer([], offerA), offerB).map((offer) => offer.tripId),
    ['trip-a', 'trip-b'],
  );
});

test('replaces a repeated socket event for the same trip without removing other customers', () => {
  const refreshedOfferA = { ...offerA, fare: 28000 };

  assert.deepEqual(
    queueTripOffer([offerA, offerB], refreshedOfferA),
    [refreshedOfferA, offerB],
  );
});

test('updates expiredAt on retry dispatch without losing pending offer queue', () => {
  const retriedOfferA: DriverTripOfferPayload = {
    ...offerA,
    expiredAt: '2026-08-22T10:01:00.000Z',
  };

  const updatedQueue = queueTripOffer([offerA, offerB], retriedOfferA);
  assert.equal(updatedQueue.length, 2);
  assert.equal(updatedQueue[0].expiredAt, '2026-08-22T10:01:00.000Z');
  assert.equal(updatedQueue[1].tripId, 'trip-b');
});

test('removes only the offer that is declined, cancelled, or won by another driver', () => {
  assert.deepEqual(
    removeTripOffer([offerA, offerB], 'trip-a').map((offer) => offer.tripId),
    ['trip-b'],
  );
});

test('calculates each offer TTL from its backend expiry timestamp', () => {
  const nowMs = Date.parse('2026-08-22T10:00:11.000Z');

  assert.deepEqual(
    [
      getRemainingOfferSeconds(offerA.expiredAt, nowMs),
      getRemainingOfferSeconds(offerB.expiredAt, nowMs),
      getRemainingOfferSeconds('không hợp lệ', nowMs),
    ],
    [19, 34, 0],
  );
});

test('correctly identifies expired offers using isOfferExpired', () => {
  const futureMs = Date.parse('2026-08-22T10:00:20.000Z');
  const expiredMs = Date.parse('2026-08-22T10:00:35.000Z');

  assert.equal(isOfferExpired(offerA.expiredAt, futureMs), false);
  assert.equal(isOfferExpired(offerA.expiredAt, expiredMs), true);
});
