import { create } from 'zustand';
import { LocationPoint, RoutePreviewData, ServiceType, Trip, TripStatus } from '../types/trip.types';

interface TripState {
  pickup: LocationPoint | null;
  dropoff: LocationPoint | null;
  serviceType: ServiceType;
  routePreview: RoutePreviewData | null;
  activeTrip: Trip | null;
  driverLocation: { lat: number; lng: number; heading?: number } | null;
  isSearchingDriver: boolean;
  isLoadingRoute: boolean;

  setPickup: (pickup: LocationPoint | null) => void;
  setDropoff: (dropoff: LocationPoint | null) => void;
  setServiceType: (type: ServiceType) => void;
  setRoutePreview: (preview: RoutePreviewData | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setTripStatus: (status: TripStatus) => void;
  setDriverLocation: (loc: { lat: number; lng: number; heading?: number } | null) => void;
  setIsSearchingDriver: (isSearching: boolean) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  resetBooking: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  pickup: null,
  dropoff: null,
  serviceType: 'CAR_4',
  routePreview: null,
  activeTrip: null,
  driverLocation: null,
  isSearchingDriver: false,
  isLoadingRoute: false,

  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setServiceType: (serviceType) => set({ serviceType }),
  setRoutePreview: (routePreview) => set({ routePreview }),
  setActiveTrip: (activeTrip) => set({ activeTrip }),
  setTripStatus: (status) =>
    set((state) => ({
      activeTrip: state.activeTrip ? { ...state.activeTrip, status } : null,
    })),
  setDriverLocation: (driverLocation) => set({ driverLocation }),
  setIsSearchingDriver: (isSearchingDriver) => set({ isSearchingDriver }),
  setIsLoadingRoute: (isLoadingRoute) => set({ isLoadingRoute }),
  resetBooking: () =>
    set({
      pickup: null,
      dropoff: null,
      routePreview: null,
      activeTrip: null,
      driverLocation: null,
      isSearchingDriver: false,
    }),
}));
