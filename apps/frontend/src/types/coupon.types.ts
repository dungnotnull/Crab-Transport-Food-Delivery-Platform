export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_trip_value: number;
  max_discount: number | null;
  usage_limit: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponDto {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_trip_value?: number;
  max_discount?: number;
  usage_limit: number;
  valid_from?: string;
  valid_until: string;
  is_active?: boolean;
}

export interface UpdateCouponDto {
  code?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  min_trip_value?: number;
  max_discount?: number;
  usage_limit?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface ValidateCouponResult {
  discountAmount: number;
  finalFare: number;
  coupon: Coupon;
}
