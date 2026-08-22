import type { Trip } from '../types/trip.types';

interface CustomerTripHydrationActions {
  onEmpty: () => void;
  onActive: (trip: Trip) => void;
}

/** Applies the API result exactly, preventing an old in-memory trip from surviving an empty response. */
export function hydrateCustomerActiveTrip(
  trip: Trip | null,
  actions: CustomerTripHydrationActions,
): boolean {
  if (!trip) {
    actions.onEmpty();
    return false;
  }

  actions.onActive(trip);
  return true;
}
