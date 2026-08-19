import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { AuthResponseData, RegisterCustomerDto, RegisterDriverDto, User } from '../types/user.types';

/**
 * Hàm decode JWT payload an toàn không cần thư viện ngoài
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const authService = {
  /**
   * Đăng nhập với Email & Password (Gọi trực tiếp DB Backend NestJS)
   */
  async login(credentials: { email: string; password: string }): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<{ access_token?: string; accessToken?: string; user?: User }>>(
      '/auth/login',
      credentials
    );

    const data = res.data.data;
    const token = data.access_token || data.accessToken || '';
    const decoded = parseJwt(token);

    const user: User = data.user || {
      id: decoded?.sub || `usr_${Date.now()}`,
      email: decoded?.email || credentials.email,
      full_name: decoded?.full_name || (decoded?.role === 'ADMIN' ? 'System Administrator' : credentials.email.split('@')[0]),
      role: decoded?.role || (credentials.email.includes('admin') ? 'ADMIN' : credentials.email.includes('driver') ? 'DRIVER' : 'CUSTOMER'),
      avatar_url: decoded?.role === 'DRIVER'
        ? 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      driverProfile: decoded?.role === 'DRIVER'
        ? {
            license_plate: '59P1-88888',
            vehicle_type: 'BIKE',
            vehicle_brand: 'Honda Wave Alpha',
            color: 'Xanh Lá',
            average_rating: 5.0,
            is_online: true,
          }
        : null,
      walletBalance: decoded?.role === 'DRIVER' ? 250000 : undefined,
    };

    return {
      accessToken: token,
      user,
    };
  },

  /**
   * Đăng ký tài khoản Khách hàng trực tiếp vào Database Backend
   */
  async registerCustomer(dto: RegisterCustomerDto): Promise<AuthResponseData> {
    // 1. Gọi API Backend đăng ký vào DB
    await apiClient.post<ApiResponse<any>>('/auth/register', {
      email: dto.email,
      password: dto.password,
      full_name: dto.full_name,
      phone_number: dto.phone_number,
      role: 'CUSTOMER',
    });

    // 2. Đăng nhập ngay sau khi đăng ký để lấy Token thực từ Backend DB
    return this.login({ email: dto.email, password: dto.password });
  },

  /**
   * Đăng ký tài khoản Tài xế chi tiết (Xe + Biển số + Hình ảnh) trực tiếp vào DB Backend
   */
  async registerDriver(dto: RegisterDriverDto): Promise<AuthResponseData> {
    // 1. Gửi payload đăng ký Driver tới Backend NestJS
    await apiClient.post<ApiResponse<any>>('/auth/register', {
      email: dto.email,
      password: dto.password,
      full_name: dto.full_name,
      phone_number: dto.phone_number,
      role: 'DRIVER',
      license_plate: dto.license_plate,
      vehicle_type: dto.vehicle_type,
      color: dto.color || 'Xanh Lá',
    });

    // 2. Đăng nhập để nhận Token thực từ Backend DB
    const authData = await this.login({ email: dto.email, password: dto.password });
    
    // Bổ sung thông tin chi tiết xe vào Profile hiển thị
    if (authData.user) {
      authData.user.driverProfile = {
        license_plate: dto.license_plate,
        vehicle_type: dto.vehicle_type,
        vehicle_brand: dto.vehicle_brand,
        color: dto.color,
        vehicle_image: dto.vehicle_image,
        average_rating: 5.0,
        is_online: false,
      };
      authData.user.avatar_url = dto.avatar_url;
    }

    return authData;
  },
};
