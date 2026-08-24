import test from 'node:test';
import assert from 'node:assert/strict';
import { submitTripRating, applyDriverRatingUpdate } from '../src/utils/ratingSubmission.utils.ts';

test('closes the rating flow only after the API records the review', async () => {
  const calls: Array<[string, number, string]> = [];
  let succeeded = false;
  let failed = false;

  const result = await submitTripRating({
    tripId: 'trip-1',
    rating: 5,
    feedback: 'Lái xe an toàn',
    rateTrip: async (...args) => {
      calls.push(args);
    },
    onSuccess: () => {
      succeeded = true;
    },
    onError: () => {
      failed = true;
    },
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [['trip-1', 5, 'Lái xe an toàn']]);
  assert.equal(succeeded, true);
  assert.equal(failed, false);
});

test('keeps the rating flow open when the API rejects the review', async () => {
  const apiError = new Error('rating unavailable');
  let succeeded = false;
  let receivedError: unknown;

  const result = await submitTripRating({
    tripId: 'trip-2',
    rating: 3,
    feedback: 'Cần cải thiện',
    rateTrip: async () => {
      throw apiError;
    },
    onSuccess: () => {
      succeeded = true;
    },
    onError: (error) => {
      receivedError = error;
    },
  });

  assert.equal(result, false);
  assert.equal(succeeded, false);
  assert.equal(receivedError, apiError);
});

test('correctly applies dynamic driver rating update from socket event or fresh API data', () => {
  const initialProfile = {
    license_plate: '59A-12345',
    average_rating: 4.5,
  };

  const updated = applyDriverRatingUpdate(initialProfile, 4.8);
  assert.equal(updated?.average_rating, 4.8);
  assert.equal(updated?.license_plate, '59A-12345');

  const updatedFromNull = applyDriverRatingUpdate(null, 5.0);
  assert.equal(updatedFromNull?.average_rating, 5.0);

  // Invalid rating values should not corrupt state
  const invalidLow = applyDriverRatingUpdate(initialProfile, 0.5);
  assert.equal(invalidLow?.average_rating, 4.5);

  const invalidHigh = applyDriverRatingUpdate(initialProfile, 6.0);
  assert.equal(invalidHigh?.average_rating, 4.5);
});
