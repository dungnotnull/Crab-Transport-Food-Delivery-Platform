import { create } from 'zustand';
import { DriverTripOfferPayload } from '../types/socket.types';

interface DriverState {
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  incomingOffer: DriverTripOfferPayload | null;
  activeTripId: string | null;
  setIsOnline: (online: boolean) => void;
  setCurrentLocation: (loc: { lat: number; lng: number }) => void;
  setIncomingOffer: (offer: DriverTripOfferPayload | null) => void;
  setActiveTripId: (tripId: string | null) => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  currentLocation: null,
  incomingOffer: null,
  activeTripId: null,

  setIsOnline: (isOnline) => set({ isOnline }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setIncomingOffer: (incomingOffer) => set({ incomingOffer }),
  setActiveTripId: (activeTripId) => set({ activeTripId }),
}));
