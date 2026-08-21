export type TripStatus =
  | 'FINDING_DRIVER'
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'ARRIVED_AT_RESTAURANT'
  | 'WAITING_FOR_FOOD'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'ARRIVED_AT_CUSTOMER'
  | 'COMPLETED'
  | 'CANCELLED';

export type ServiceType = 'BIKE' | 'CAR_4' | 'CAR_7';
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'E_WALLET';

export interface LocationPoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface AddressSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
  point: LocationPoint;
  osmType?: string;
  osmId?: string | number;
}

export interface RoutePreviewData {
  distance: number; // in meters or km
  duration: number; // in seconds or minutes
  fare: number; // in VND
  geometry: [number, number][]; // array of [lat, lng]
  breakdown?: {
    originalFare: number;
    discount: number;
  };
}

export interface Trip {
  id: string;
  customer_id?: string;
  driver_id?: string;
  pickup_location: LocationPoint;
  dropoff_location: LocationPoint;
  status: TripStatus;
  total_fare: number;
  service_type: ServiceType;
  payment_method: PaymentMethod;
  distance?: number;
  duration?: number;
  driver?: {
    id: string;
    full_name: string;
    phone_number?: string;
    avatar_url?: string;
    driverProfile?: {
      license_plate?: string;
      vehicle_brand?: string;
      vehicle_type?: string;
      average_rating?: number;
      vehicle_image?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export interface BookTripDto {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: ServiceType;
  coupon_code?: string;
  paymentMethod?: PaymentMethod;
}
