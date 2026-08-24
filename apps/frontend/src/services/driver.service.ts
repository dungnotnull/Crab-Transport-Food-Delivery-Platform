import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';

export const driverService = {
  /**
   * Bật/Tắt chế độ Trực tuyến trong DB (`PATCH /api/v1/drivers/status`)
   */
  async toggleOnlineStatus(isOnline: boolean): Promise<void> {
    await apiClient.patch('/drivers/status', { is_online: isOnline });
  },

  /**
   * Cập nhật vị trí GPS tài xế vào DB (`PATCH /api/v1/drivers/location`)
   */
  async updateLocation(lat: number, lng: number): Promise<void> {
    await apiClient.patch('/drivers/location', { lat, lng });
  },

  /**
   * Nhận cuốc xe thực tế (Hỗ trợ bắt lỗi 409 Conflict) (`POST /api/v1/trips/:id/accept`)
   */
  async acceptTrip(tripId: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/trips/${tripId}/accept`);
    return res.data.data;
  },

  /**
   * Từ chối cuốc xe trong DB (`POST /api/v1/trips/:id/reject`)
   * Ghi nhận tài xế đã từ chối để hệ thống tìm tài xế khác và không phát lại cuốc này cho tài xế
   */
  async rejectTrip(tripId: string): Promise<void> {
    await apiClient.post(`/trips/${tripId}/reject`);
  },

  /**
   * Cập nhật trạng thái chuyến đi trong DB (`PATCH /api/v1/trips/:id/status`)
   */
  async updateTripStatus(tripId: string, status: string): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(`/trips/${tripId}/status`, { status });
    return res.data.data;
  },

  /**
   * Lấy lịch sử cuốc xe của tài xế (`GET /api/v1/trips/driver/history`)
   */
  async getDriverHistory(): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/trips/driver/history');
    return res.data.data;
  },

  /**
   * Lấy thông tin ví và lịch sử giao dịch (`GET /api/v1/wallets/me`)
   */
  async getWalletDetails(): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>('/wallets/me');
    return res.data.data;
  },

  /**
   * Lấy thông tin hồ sơ và rating cập nhật mới nhất của tài xế (`GET /api/v1/drivers/profile`)
   */
  async getProfile(): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>('/drivers/profile');
    return res.data.data;
  }
};
