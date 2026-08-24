import type { DriverTripOfferPayload } from '../types/socket.types';

/** Giữ từng tripId riêng để hai khách cùng điểm đón không làm mất offer của nhau. */
export function queueTripOffer(
  offers: readonly DriverTripOfferPayload[],
  incomingOffer: DriverTripOfferPayload,
): DriverTripOfferPayload[] {
  const existingIndex = offers.findIndex((offer) => offer.tripId === incomingOffer.tripId);

  if (existingIndex === -1) return [...offers, incomingOffer];

  return offers.map((offer) => (
    offer.tripId === incomingOffer.tripId ? incomingOffer : offer
  ));
}

export function removeTripOffer(
  offers: readonly DriverTripOfferPayload[],
  tripId: string,
): DriverTripOfferPayload[] {
  return offers.filter((offer) => offer.tripId !== tripId);
}

export function getRemainingOfferSeconds(
  expiredAt: string,
  currentTimeMs = Date.now(),
): number {
  const expiredAtMs = Date.parse(expiredAt);
  if (!Number.isFinite(expiredAtMs) || !Number.isFinite(currentTimeMs)) return 0;

  return Math.max(0, Math.ceil((expiredAtMs - currentTimeMs) / 1000));
}

/**
 * Kiểm tra xem một offer có phải là đợt retry phát lại hay không
 * (Dựa trên chênh lệch thời gian hoặc danh sách tripId đã từng thấy)
 */
export function isOfferExpired(
  expiredAt: string,
  currentTimeMs = Date.now(),
): boolean {
  return getRemainingOfferSeconds(expiredAt, currentTimeMs) <= 0;
}
