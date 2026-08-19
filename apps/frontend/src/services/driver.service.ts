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
   * Cập nhật trạng thái chuyến đi trong DB (`PATCH /api/v1/trips/:id/status`)
   */
  async updateTripStatus(tripId: string, status: string): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(`/trips/${tripId}/status`, { status });
    return res.data.data;
  },
};
