import { LocationPoint, TripStatus } from './trip.types';

export interface DriverLocationUpdatePayload {
  tripId?: string;
  lat: number;
  lng: number;
  heading?: number;
}

export interface TripLocationStreamPayload {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  timestamp: string;
}

export interface TripStatusChangedPayload {
  tripId: string;
  status: TripStatus;
  reason?: string;
  timestamp: string;
}

export interface DriverTripOfferPayload {
  tripId: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  fare: number;
  distance?: number;
  duration?: number;
  expiredAt: string;
}
