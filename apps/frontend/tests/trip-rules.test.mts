import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCustomerCancel,
  getTripAcceptErrorMessage,
  isTripAcceptConflict,
} from '../src/utils/tripRules.ts';

test('allows customer cancellation only before the driver arrives', () => {
  assert.equal(canCustomerCancel('FINDING_DRIVER'), true);
  assert.equal(canCustomerCancel('ACCEPTED'), true);
  assert.equal(canCustomerCancel('ARRIVED_AT_PICKUP'), false);
  assert.equal(canCustomerCancel('ARRIVED_AT_RESTAURANT'), false);
  assert.equal(canCustomerCancel('WAITING_FOR_FOOD'), false);
  assert.equal(canCustomerCancel('IN_TRANSIT'), false);
  assert.equal(canCustomerCancel('ARRIVED_AT_DESTINATION'), false);
  assert.equal(canCustomerCancel('ARRIVED_AT_CUSTOMER'), false);
  assert.equal(canCustomerCancel('COMPLETED'), false);
  assert.equal(canCustomerCancel('CANCELLED'), false);
});

test('recognizes the losing response when drivers compete for one trip', () => {
  const conflict = { response: { status: 409 } };

  assert.equal(isTripAcceptConflict(conflict), true);
  assert.match(getTripAcceptErrorMessage(conflict), /tài xế khác/i);
  assert.equal(isTripAcceptConflict({ response: { status: 500 } }), false);
});

test('keeps a non-conflict offer available for retry', () => {
  const serverError = { response: { status: 500 } };

  assert.equal(isTripAcceptConflict(serverError), false);
  assert.match(getTripAcceptErrorMessage(serverError), /thử lại/i);
});
