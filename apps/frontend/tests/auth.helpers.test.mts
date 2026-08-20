import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getApiErrorMessage,
  isAuthUnauthorizedError,
  normalizeAuthResponse,
} from '../src/services/auth.helpers.ts';

test('normalizes the documented access_token response without inventing user data', () => {
  const user = {
    id: 'user-1',
    email: 'customer@crab.com',
    full_name: 'Nguyễn Văn A',
    role: 'CUSTOMER' as const,
  };

  assert.deepEqual(
    normalizeAuthResponse({ access_token: 'token-1', user }),
    { accessToken: 'token-1', user },
  );
});

test('rejects an auth response that has no real token or user', () => {
  assert.throws(
    () => normalizeAuthResponse({ access_token: 'token-1' }),
    /không hợp lệ/i,
  );
});

test('recognizes an HTTP 401 as an invalid-credentials response', () => {
  assert.equal(isAuthUnauthorizedError({ response: { status: 401 } }), true);
  assert.equal(isAuthUnauthorizedError({ response: { status: 500 } }), false);
});

test('extracts a useful API validation message from the contract error shape', () => {
  assert.equal(
    getApiErrorMessage(
      { response: { data: { message: ['Email không hợp lệ', 'Mật khẩu quá ngắn'] } } },
      'Đăng ký thất bại',
    ),
    'Email không hợp lệ, Mật khẩu quá ngắn',
  );
});
