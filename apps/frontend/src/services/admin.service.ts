import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/user.types';

export interface AdminStats {
  totalTripsToday: number;
  totalGmvToday: number;
  activeOnlineDrivers: number;
  completedTripsCount: number;
  isRaining: boolean;
}

export const adminService = {
  /**
   * Lấy danh sách Khách hàng thực tế từ Database (`GET /api/v1/users/customers`)
   */
  async getCustomers(): Promise<User[]> {
    const res = await apiClient.get<ApiResponse<User[]>>('/users/customers');
    return res.data.data;
  },

  /**
   * Lấy danh sách Tài xế thực tế từ Database (`GET /api/v1/users/drivers`)
   */
  async getDrivers(): Promise<User[]> {
    const res = await apiClient.get<ApiResponse<User[]>>('/users/drivers');
    return res.data.data;
  },

  /**
   * Khóa / Mở khóa tài khoản thực tế trong Database (`PATCH /api/v1/users/:id/toggle-active`)
   */
  async toggleUserActive(userId: string, isActive: boolean): Promise<User> {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${userId}/toggle-active`, {
      is_active: isActive,
    });
    return res.data.data;
  },

  /**
   * Bật/Tắt chế độ mưa bão (Surge +50%) (`POST /api/v1/pricing/weather`)
   */
  async toggleWeatherSurge(isRaining: boolean): Promise<void> {
    await apiClient.post('/pricing/weather', { isRaining });
  },
};
