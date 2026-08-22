import test from 'node:test';
import assert from 'node:assert/strict';
import { startAuthenticatedSession } from '../src/utils/sessionIsolation.utils.ts';

test('starting a new login clears trip and driver state before reconnecting the socket', () => {
  const sequence: string[] = [];

  startAuthenticatedSession({
    disconnectSocket: () => sequence.push('disconnect'),
    resetTripState: () => sequence.push('reset-trip'),
    resetDriverState: () => sequence.push('reset-driver'),
    connectSocket: () => sequence.push('connect'),
  });

  assert.deepEqual(sequence, ['disconnect', 'reset-trip', 'reset-driver', 'connect']);
});
