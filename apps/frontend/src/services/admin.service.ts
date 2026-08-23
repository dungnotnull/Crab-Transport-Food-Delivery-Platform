import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/user.types';
import { normalizeWeatherStatus } from '../utils/weatherStatus.utils';

export interface AdminStats {
  totalTrips: number;
  totalRevenue: number;
  totalCustomers: number;
  totalDrivers: number;
}

export const adminService = {
  /**
   * Lấy thống kê tổng quan thực tế từ Backend DB (`GET /api/v1/admin/statistics`)
   */
  async getStatistics(): Promise<AdminStats> {
    const res = await apiClient.get<any>('/admin/statistics');
    const raw = res.data?.data;
    const statsData = raw && typeof raw === 'object' && 'data' in raw && raw.data ? raw.data : raw;

    return {
      totalTrips: Number(statsData?.totalTrips) || 0,
      totalRevenue: Number(statsData?.totalRevenue) || 0,
      totalCustomers: Number(statsData?.totalCustomers) || 0,
      totalDrivers: Number(statsData?.totalDrivers) || 0,
    };
  },

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
  async getWeatherStatus(): Promise<boolean> {
    const res = await apiClient.get<ApiResponse<{ isExtremeWeather: boolean }>>('/pricing/weather');
    return normalizeWeatherStatus(res.data.data);
  },

  async toggleWeatherSurge(isRaining: boolean): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<{ isExtremeWeather: boolean }>>(
      '/pricing/weather',
      { isRaining },
    );
    return normalizeWeatherStatus(res.data.data);
  },
};
