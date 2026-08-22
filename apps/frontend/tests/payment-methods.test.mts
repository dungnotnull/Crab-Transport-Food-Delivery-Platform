import test from 'node:test';
import assert from 'node:assert/strict';
import { PAYMENT_METHOD_OPTIONS } from '../src/utils/paymentMethods.utils.ts';

test('offers every supported payment method exactly once', () => {
  const values = PAYMENT_METHOD_OPTIONS.map((option) => option.value);

  assert.deepEqual(values, ['CASH', 'CREDIT_CARD', 'E_WALLET']);
  assert.equal(new Set(values).size, values.length);
});

