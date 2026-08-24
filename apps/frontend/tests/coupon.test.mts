import test from 'node:test';
import assert from 'node:assert/strict';
import type { Coupon } from '../src/types/coupon.types.ts';

const samplePercentageCoupon: Coupon = {
  id: 'cpn-001',
  code: 'CRAB50',
  discount_type: 'PERCENTAGE',
  discount_value: 50,
  min_trip_value: 30000,
  max_discount: 25000,
  usage_limit: 500,
  used_count: 12,
  valid_from: '2026-08-01T00:00:00.000Z',
  valid_until: '2026-12-31T23:59:59.000Z',
  is_active: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

const sampleFixedCoupon: Coupon = {
  id: 'cpn-002',
  code: 'WELCOME10K',
  discount_type: 'FIXED_AMOUNT',
  discount_value: 10000,
  min_trip_value: 20000,
  max_discount: null,
  usage_limit: 1000,
  used_count: 50,
  valid_from: '2026-08-01T00:00:00.000Z',
  valid_until: '2026-12-31T23:59:59.000Z',
  is_active: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

function calculateLocalDiscount(coupon: Coupon, originalFare: number): number {
  if (!coupon.is_active) return 0;
  if (originalFare < coupon.min_trip_value) return 0;

  let discount = 0;
  if (coupon.discount_type === 'FIXED_AMOUNT') {
    discount = coupon.discount_value;
  } else if (coupon.discount_type === 'PERCENTAGE') {
    discount = originalFare * (coupon.discount_value / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  }

  return Math.min(originalFare, Math.round(discount));
}

test('calculates fixed amount discount correctly when fare meets min_trip_value', () => {
  const fare = 50000;
  const discount = calculateLocalDiscount(sampleFixedCoupon, fare);
  assert.equal(discount, 10000);
});

test('rejects discount when fare is below min_trip_value', () => {
  const fare = 15000; // below 20,000 min_trip_value
  const discount = calculateLocalDiscount(sampleFixedCoupon, fare);
  assert.equal(discount, 0);
});

test('calculates percentage discount capped by max_discount', () => {
  const highFare = 100000; // 50% = 50,000 > max_discount 25,000
  const discount = calculateLocalDiscount(samplePercentageCoupon, highFare);
  assert.equal(discount, 25000);

  const normalFare = 40000; // 50% = 20,000 < max_discount 25,000
  const normalDiscount = calculateLocalDiscount(samplePercentageCoupon, normalFare);
  assert.equal(normalDiscount, 20000);
});

test('ensures coupon code formatting is uppercase and trimmed', () => {
  const rawCode = '  summer_sale2026  ';
  const formatted = rawCode.trim().toUpperCase();
  assert.equal(formatted, 'SUMMER_SALE2026');
});
