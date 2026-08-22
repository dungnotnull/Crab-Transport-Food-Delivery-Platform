import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_DRIVER_WALLET_BALANCE,
  canDriverGoOnline,
} from '../src/utils/driverWallet.utils.ts';

test('blocks going online until a driver wallet is loaded and reaches 100000 VND', () => {
  assert.equal(MIN_DRIVER_WALLET_BALANCE, 100_000);
  assert.equal(canDriverGoOnline(null), false);
  assert.equal(canDriverGoOnline(Number.NaN), false);
  assert.equal(canDriverGoOnline(99_999), false);
  assert.equal(canDriverGoOnline(100_000), true);
  assert.equal(canDriverGoOnline(150_000), true);
});

