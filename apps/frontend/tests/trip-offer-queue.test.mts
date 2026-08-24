import test from 'node:test';
import assert from 'node:assert/strict';
import type { DriverTripOfferPayload } from '../src/types/socket.types.ts';
import {
  DRIVER_OFFER_TTL_SECONDS,
  queueTripOffer,
  removeTripOffer,
  getRemainingOfferSeconds,
  isOfferExpired,
  isTripRejected,
  recordRejectedTrip,
} from '../src/utils/tripOfferQueue.utils.ts';

const offerA: DriverTripOfferPayload = {
  tripId: 'trip-a',
  pickup: { lat: 10.77, lng: 106.7, address: 'Điểm đón A' },
  dropoff: { lat: 10.78, lng: 106.71, address: 'Điểm đến A' },
  fare: 25000,
  expiredAt: '2026-08-22T10:00:30.000Z',
  receivedAt: Date.parse('2026-08-22T10:00:00.000Z'),
};

const offerB: DriverTripOfferPayload = {
  tripId: 'trip-b',
  pickup: { lat: 10.77, lng: 106.7, address: 'Điểm đón B' },
  dropoff: { lat: 10.79, lng: 106.72, address: 'Điểm đến B' },
  fare: 31000,
  expiredAt: '2026-08-22T10:00:45.000Z',
  receivedAt: Date.parse('2026-08-22T10:00:10.000Z'),
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

test('preserves original receivedAt timestamp on retry dispatch without resetting 30s window', () => {
  const retriedOfferA: DriverTripOfferPayload = {
    ...offerA,
    expiredAt: '2026-08-22T10:01:00.000Z',
    receivedAt: Date.parse('2026-08-22T10:00:15.000Z'), // Later arrival timestamp from retry socket
  };

  const updatedQueue = queueTripOffer([offerA, offerB], retriedOfferA);
  assert.equal(updatedQueue.length, 2);
  assert.equal(updatedQueue[0].expiredAt, '2026-08-22T10:01:00.000Z');
  // Original receivedAt must be preserved
  assert.equal(updatedQueue[0].receivedAt, offerA.receivedAt);
  assert.equal(updatedQueue[1].tripId, 'trip-b');
});

test('removes only the offer that is declined, cancelled, or won by another driver', () => {
  assert.deepEqual(
    removeTripOffer([offerA, offerB], 'trip-a').map((offer) => offer.tripId),
    ['trip-b'],
  );
});

test('calculates 30s offer countdown from receivedAt timestamp', () => {
  const baseMs = Date.parse('2026-08-22T10:00:00.000Z');
  const t10Ms = Date.parse('2026-08-22T10:00:10.000Z');
  const t25Ms = Date.parse('2026-08-22T10:00:25.000Z');
  const t30Ms = Date.parse('2026-08-22T10:00:30.000Z');
  const t35Ms = Date.parse('2026-08-22T10:00:35.000Z');

  assert.equal(getRemainingOfferSeconds(offerA, baseMs), 30);
  assert.equal(getRemainingOfferSeconds(offerA, t10Ms), 20);
  assert.equal(getRemainingOfferSeconds(offerA, t25Ms), 5);
  assert.equal(getRemainingOfferSeconds(offerA, t30Ms), 0);
  assert.equal(getRemainingOfferSeconds(offerA, t35Ms), 0);
});

test('correctly identifies expired offers after 30s using isOfferExpired', () => {
  const futureMs = Date.parse('2026-08-22T10:00:20.000Z');
  const expiredMs = Date.parse('2026-08-22T10:00:31.000Z');

  assert.equal(isOfferExpired(offerA, futureMs), false);
  assert.equal(isOfferExpired(offerA, expiredMs), true);
  assert.equal(DRIVER_OFFER_TTL_SECONDS, 30);
});

test('identifies and records rejected trips without duplicate IDs', () => {
  const rejected = recordRejectedTrip(['trip-x'], 'trip-a');
  assert.deepEqual(rejected, ['trip-x', 'trip-a']);

  const duplicateCheck = recordRejectedTrip(rejected, 'trip-a');
  assert.deepEqual(duplicateCheck, ['trip-x', 'trip-a']);

  assert.equal(isTripRejected(rejected, 'trip-a'), true);
  assert.equal(isTripRejected(rejected, 'trip-b'), false);
});

test('does not queue an incoming offer if its tripId was rejected by the driver', () => {
  const queueWithRejected = queueTripOffer([offerB], offerA, ['trip-a']);
  assert.deepEqual(
    queueWithRejected.map((offer) => offer.tripId),
    ['trip-b'],
  );
});

test('ignores retry dispatch events when tripId has been marked as rejected', () => {
  let activeOffers: DriverTripOfferPayload[] = [offerA, offerB];
  let rejectedTripIds: string[] = [];

  // Driver rejects offerA
  activeOffers = removeTripOffer(activeOffers, 'trip-a');
  rejectedTripIds = recordRejectedTrip(rejectedTripIds, 'trip-a');

  assert.deepEqual(activeOffers.map((o) => o.tripId), ['trip-b']);
  assert.deepEqual(rejectedTripIds, ['trip-a']);

  // Backend retries dispatching offerA after 15 seconds
  const retriedOfferA: DriverTripOfferPayload = {
    ...offerA,
    expiredAt: '2026-08-22T10:01:15.000Z',
  };
  activeOffers = queueTripOffer(activeOffers, retriedOfferA, rejectedTripIds);

  // offerA must NOT be re-added to activeOffers
  assert.deepEqual(activeOffers.map((o) => o.tripId), ['trip-b']);

  // Normal new offer C can be queued successfully
  const offerC: DriverTripOfferPayload = {
    tripId: 'trip-c',
    pickup: { lat: 10.77, lng: 106.7, address: 'Điểm đón C' },
    dropoff: { lat: 10.80, lng: 106.73, address: 'Điểm đến C' },
    fare: 45000,
    expiredAt: '2026-08-22T10:02:00.000Z',
    receivedAt: Date.parse('2026-08-22T10:00:20.000Z'),
  };
  activeOffers = queueTripOffer(activeOffers, offerC, rejectedTripIds);
  assert.deepEqual(activeOffers.map((o) => o.tripId), ['trip-b', 'trip-c']);
});
