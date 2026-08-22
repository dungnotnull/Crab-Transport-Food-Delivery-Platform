import test from 'node:test';
import assert from 'node:assert/strict';
import { LatestRequestController } from '../src/utils/latestRequest.utils.ts';

test('aborts the previous request when a newer request starts', () => {
  const requests = new LatestRequestController();
  const firstSignal = requests.next();
  const secondSignal = requests.next();

  assert.equal(firstSignal.aborted, true);
  assert.equal(secondSignal.aborted, false);
});

test('can abort the current request during cleanup', () => {
  const requests = new LatestRequestController();
  const signal = requests.next();

  requests.abort();

  assert.equal(signal.aborted, true);
});
