import test from 'node:test';
import assert from 'node:assert/strict';
import { getTripSearchElapsedSeconds } from '../src/utils/tripWaitingTime.utils.ts';

const nowMs = Date.parse('2026-08-22T10:01:10.999Z');

test('calculates the customer wait from the trip creation time instead of modal mount time', () => {
  assert.equal(
    getTripSearchElapsedSeconds('2026-08-22T10:00:00.000Z', nowMs),
    70,
  );
});

test('keeps simultaneous customer trips on their own independent waiting clocks', () => {
  const sharedCurrentTime = Date.parse('2026-08-22T10:03:00.000Z');

  assert.deepEqual(
    [
      getTripSearchElapsedSeconds('2026-08-22T10:02:40.000Z', sharedCurrentTime),
      getTripSearchElapsedSeconds('2026-08-22T10:01:25.000Z', sharedCurrentTime),
    ],
    [20, 95],
  );
});

test('does not display a negative or fabricated wait for missing and invalid creation times', () => {
  assert.equal(getTripSearchElapsedSeconds(undefined, nowMs), 0);
  assert.equal(getTripSearchElapsedSeconds('không phải thời gian', nowMs), 0);
  assert.equal(getTripSearchElapsedSeconds('2026-08-22T10:02:00.000Z', nowMs), 0);
});
