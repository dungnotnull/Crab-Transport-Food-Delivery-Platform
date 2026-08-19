export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SYSTEM_ADMIN';

export interface DriverProfile {
  id?: string;
  license_plate: string;
  vehicle_type: 'BIKE' | 'CAR';
  vehicle_brand?: string;
  color?: string;
  vehicle_image?: string;
  average_rating?: number;
  is_online?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  avatar_url?: string;
  is_active?: boolean;
  driverProfile?: DriverProfile | null;
  walletBalance?: number;
}

export interface AuthResponseData {
  accessToken: string;
  user: User;
}

export interface RegisterDriverDto {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  role: 'DRIVER';
  avatar_url?: string;
  license_plate: string;
  vehicle_type: 'BIKE' | 'CAR';
  vehicle_brand: string;
  color?: string;
  vehicle_image?: string;
}

export interface RegisterCustomerDto {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  role: 'CUSTOMER';
  avatar_url?: string;
}
