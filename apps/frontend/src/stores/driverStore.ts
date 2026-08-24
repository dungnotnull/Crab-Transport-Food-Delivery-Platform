import { create } from 'zustand';
import type { DriverTripOfferPayload } from '../types/socket.types';
import {
  queueTripOffer,
  removeTripOffer,
  recordRejectedTrip,
} from '../utils/tripOfferQueue.utils';

interface DriverState {
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  incomingOffers: DriverTripOfferPayload[];
  rejectedTripIds: string[];
  activeTripId: string | null;
  setIsOnline: (online: boolean) => void;
  setCurrentLocation: (loc: { lat: number; lng: number }) => void;
  queueIncomingOffer: (offer: DriverTripOfferPayload) => void;
  removeIncomingOffer: (tripId: string) => void;
  rejectIncomingOffer: (tripId: string) => void;
  clearIncomingOffers: () => void;
  resetSessionState: () => void;
  setActiveTripId: (tripId: string | null) => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  currentLocation: null,
  incomingOffers: [],
  rejectedTripIds: [],
  activeTripId: null,

  setIsOnline: (isOnline) => set({ isOnline }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  queueIncomingOffer: (offer) => set((state) => ({
    incomingOffers: queueTripOffer(state.incomingOffers, offer, state.rejectedTripIds),
  })),
  removeIncomingOffer: (tripId) => set((state) => ({
    incomingOffers: removeTripOffer(state.incomingOffers, tripId),
  })),
  rejectIncomingOffer: (tripId) => set((state) => ({
    rejectedTripIds: recordRejectedTrip(state.rejectedTripIds, tripId),
    incomingOffers: removeTripOffer(state.incomingOffers, tripId),
  })),
  clearIncomingOffers: () => set({ incomingOffers: [] }),
  resetSessionState: () => set({
    isOnline: false,
    currentLocation: null,
    incomingOffers: [],
    rejectedTripIds: [],
    activeTripId: null,
  }),
  setActiveTripId: (activeTripId) => set({ activeTripId }),
}));
