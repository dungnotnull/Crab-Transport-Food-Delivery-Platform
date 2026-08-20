import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { AuthResponseData, RegisterCustomerDto, RegisterDriverDto } from '../types/user.types';
import {
  getApiErrorMessage,
  isApiConflictError,
  isAuthUnauthorizedError,
  normalizeAuthResponse,
} from './auth.helpers';

const SAMPLE_CUSTOMER: RegisterCustomerDto = {
  email: 'customer@crab.com',
  password: 'password123',
  full_name: 'Nguyễn Văn Customer',
  phone_number: '0900000001',
  role: 'CUSTOMER',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
};

const SAMPLE_DRIVER: RegisterDriverDto = {
  email: 'driver1@crab.com',
  password: 'password123',
  full_name: 'Trần Văn Tài Xế',
  phone_number: '0900000002',
  role: 'DRIVER',
  avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  license_plate: '51H-888.88',
  vehicle_type: 'CAR_4',
  vehicle_brand: 'Toyota Vios 1.5G',
  color: 'Trắng Ánh Kim',
  vehicle_image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
};

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

  async loginSample(role: 'CUSTOMER' | 'DRIVER'): Promise<AuthResponseData> {
    const sample = role === 'DRIVER' ? SAMPLE_DRIVER : SAMPLE_CUSTOMER;

    try {
      return await this.login(sample);
    } catch (error) {
      if (!isAuthUnauthorizedError(error)) throw error;

      try {
        return role === 'DRIVER'
          ? await this.registerDriver(SAMPLE_DRIVER)
          : await this.registerCustomer(SAMPLE_CUSTOMER);
      } catch (registrationError) {
        if (isApiConflictError(registrationError)) {
          return this.login(sample);
        }
        throw registrationError;
      }
    }
  },

  getErrorMessage(error: unknown, fallback: string): string {
    return getApiErrorMessage(error, fallback);
  },
};
