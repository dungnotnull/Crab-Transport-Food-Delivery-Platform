import { create } from 'zustand';
import { DriverTripOfferPayload } from '../types/socket.types';
import { queueTripOffer, removeTripOffer } from '../utils/tripOfferQueue.utils';

interface DriverState {
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  incomingOffers: DriverTripOfferPayload[];
  activeTripId: string | null;
  setIsOnline: (online: boolean) => void;
  setCurrentLocation: (loc: { lat: number; lng: number }) => void;
  queueIncomingOffer: (offer: DriverTripOfferPayload) => void;
  removeIncomingOffer: (tripId: string) => void;
  clearIncomingOffers: () => void;
  resetSessionState: () => void;
  setActiveTripId: (tripId: string | null) => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  currentLocation: null,
  incomingOffers: [],
  activeTripId: null,

  setIsOnline: (isOnline) => set({ isOnline }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  queueIncomingOffer: (offer) => set((state) => ({
    incomingOffers: queueTripOffer(state.incomingOffers, offer),
  })),
  removeIncomingOffer: (tripId) => set((state) => ({
    incomingOffers: removeTripOffer(state.incomingOffers, tripId),
  })),
  clearIncomingOffers: () => set({ incomingOffers: [] }),
  resetSessionState: () => set({
    isOnline: false,
    currentLocation: null,
    incomingOffers: [],
    activeTripId: null,
  }),
  setActiveTripId: (activeTripId) => set({ activeTripId }),
}));
