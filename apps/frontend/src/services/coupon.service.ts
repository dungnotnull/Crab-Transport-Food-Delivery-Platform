import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import type {
  Coupon,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponResult,
} from '../types/coupon.types';

function extractData<T>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData) {
    return resData.data as T;
  }
  return resData as T;
}

export const couponService = {
  /**
   * Lấy danh sách toàn bộ coupons (Admin / System Admin) (`GET /api/v1/coupons`)
   */
  async getAllCoupons(): Promise<Coupon[]> {
    const res = await apiClient.get<ApiResponse<Coupon[]>>('/coupons');
    return extractData<Coupon[]>(res.data) || [];
  },

  /**
   * Lấy danh sách coupon đang hoạt động và còn hạn (Customer / Admin) (`GET /api/v1/coupons/active`)
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    const res = await apiClient.get<ApiResponse<Coupon[]>>('/coupons/active');
    return extractData<Coupon[]>(res.data) || [];
  },

  /**
   * Lấy chi tiết coupon theo ID (`GET /api/v1/coupons/:id`)
   */
  async getCouponById(id: string): Promise<Coupon> {
    const res = await apiClient.get<ApiResponse<Coupon>>(`/coupons/${id}`);
    return extractData<Coupon>(res.data);
  },

  /**
   * Tạo mới coupon (`POST /api/v1/coupons`)
   */
  async createCoupon(payload: CreateCouponDto): Promise<Coupon> {
    const res = await apiClient.post<ApiResponse<Coupon>>('/coupons', {
      ...payload,
      code: payload.code.trim().toUpperCase(),
    });
    return extractData<Coupon>(res.data);
  },

  /**
   * Cập nhật thông tin coupon (`PATCH /api/v1/coupons/:id`)
   */
  async updateCoupon(id: string, payload: UpdateCouponDto): Promise<Coupon> {
    const res = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}`, {
      ...payload,
      code: payload.code ? payload.code.trim().toUpperCase() : undefined,
    });
    return extractData<Coupon>(res.data);
  },

  /**
   * Bật / Tắt kích hoạt coupon nhanh (`PATCH /api/v1/coupons/:id/toggle-active`)
   */
  async toggleActiveCoupon(id: string, isActive?: boolean): Promise<Coupon> {
    const res = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}/toggle-active`, {
      is_active: isActive,
    });
    return extractData<Coupon>(res.data);
  },

  /**
   * Xóa coupon (`DELETE /api/v1/coupons/:id`)
   */
  async deleteCoupon(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/coupons/${id}`);
    return extractData<{ success: boolean; message: string }>(res.data);
  },

  /**
   * Validate coupon và tính số tiền giảm (`POST /api/v1/coupons/validate`)
   */
  async validateCoupon(code: string, originalFare: number): Promise<ValidateCouponResult> {
    const res = await apiClient.post<ApiResponse<ValidateCouponResult>>('/coupons/validate', {
      code: code.trim().toUpperCase(),
      originalFare,
    });
    return extractData<ValidateCouponResult>(res.data);
  },
};
