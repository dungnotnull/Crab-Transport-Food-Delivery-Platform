import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { AuthResponseData, RegisterCustomerDto, RegisterDriverDto } from '../types/user.types';
import {
  getApiErrorMessage,
  isApiConflictError,
  isAuthUnauthorizedError,
  normalizeAuthResponse,
} from './auth.helpers';

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<AuthResponseData> {
    const res = await apiClient.post<
      ApiResponse<{ access_token?: string; accessToken?: string; user?: AuthResponseData['user'] }>
    >('/auth/login', credentials);

    return normalizeAuthResponse(res.data.data);
  },

  async registerCustomer(dto: RegisterCustomerDto): Promise<AuthResponseData> {
    await apiClient.post<ApiResponse<unknown>>('/auth/register', {
      email: dto.email,
      password: dto.password,
      full_name: dto.full_name,
      phone_number: dto.phone_number,
      role: dto.role,
      avatar_url: dto.avatar_url,
    });

    return this.login({ email: dto.email, password: dto.password });
  },

  async registerDriver(dto: RegisterDriverDto): Promise<AuthResponseData> {
    await apiClient.post<ApiResponse<unknown>>('/auth/register', {
      email: dto.email,
      password: dto.password,
      full_name: dto.full_name,
      phone_number: dto.phone_number,
      role: dto.role,
      avatar_url: dto.avatar_url,
      license_plate: dto.license_plate,
      vehicle_type: dto.vehicle_type,
      vehicle_brand: dto.vehicle_brand,
      color: dto.color,
      vehicle_image: dto.vehicle_image,
    });

    return this.login({ email: dto.email, password: dto.password });
  },

  getErrorMessage(error: unknown, fallback: string): string {
    return getApiErrorMessage(error, fallback);
  },
};
