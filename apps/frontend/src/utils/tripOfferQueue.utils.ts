import type { DriverTripOfferPayload } from '../types/socket.types';

/** Thời gian chờ quyết định nhận cuốc của tài xế trước khi tự động hủy/ẩn (30 giây) */
export const DRIVER_OFFER_TTL_SECONDS = 30;

/** Giữ từng tripId riêng để hai khách cùng điểm đón không làm mất offer của nhau. */
export function queueTripOffer(
  offers: readonly DriverTripOfferPayload[],
  incomingOffer: DriverTripOfferPayload,
  rejectedTripIds?: readonly string[],
  currentTimeMs = Date.now(),
): DriverTripOfferPayload[] {
  // Nếu cuốc xe này đã bị tài xế từ chối trước đó, bỏ qua không đưa vào queue
  if (rejectedTripIds && rejectedTripIds.includes(incomingOffer.tripId)) {
    return [...offers];
  }

  const existingIndex = offers.findIndex((offer) => offer.tripId === incomingOffer.tripId);
  const receivedAt = incomingOffer.receivedAt ?? currentTimeMs;

  if (existingIndex === -1) {
    return [...offers, { ...incomingOffer, receivedAt }];
  }

  return offers.map((offer, index) => (
    index === existingIndex
      ? { ...incomingOffer, receivedAt: offer.receivedAt ?? receivedAt }
      : offer
  ));
}

export function removeTripOffer(
  offers: readonly DriverTripOfferPayload[],
  tripId: string,
): DriverTripOfferPayload[] {
  return offers.filter((offer) => offer.tripId !== tripId);
}

/**
 * Kiểm tra cuốc xe có nằm trong danh sách đã từ chối hay không
 */
export function isTripRejected(
  rejectedTripIds: readonly string[],
  tripId: string,
): boolean {
  return rejectedTripIds.includes(tripId);
}

/**
 * Thêm tripId vào danh sách đã từ chối không trùng lặp
 */
export function recordRejectedTrip(
  rejectedTripIds: readonly string[],
  tripId: string,
): string[] {
  if (rejectedTripIds.includes(tripId)) {
    return [...rejectedTripIds];
  }
  return [...rejectedTripIds, tripId];
}

/**
 * Tính số giây còn lại của cuốc xe (Mặc định 30 giây từ khi nhận được offer)
 */
export function getRemainingOfferSeconds(
  offerOrExpiredAt: { expiredAt?: string; receivedAt?: number } | string,
  currentTimeMs = Date.now(),
  ttlSeconds = DRIVER_OFFER_TTL_SECONDS,
): number {
  if (typeof offerOrExpiredAt === 'string') {
    const expiredAtMs = Date.parse(offerOrExpiredAt);
    if (!Number.isFinite(expiredAtMs) || !Number.isFinite(currentTimeMs)) return 0;
    return Math.max(0, Math.ceil((expiredAtMs - currentTimeMs) / 1000));
  }

  const receivedAtMs = typeof offerOrExpiredAt?.receivedAt === 'number'
    ? offerOrExpiredAt.receivedAt
    : offerOrExpiredAt?.expiredAt
    ? Date.parse(offerOrExpiredAt.expiredAt) - 15000
    : NaN;

  if (!Number.isFinite(receivedAtMs) || !Number.isFinite(currentTimeMs)) return 0;

  const elapsedMs = currentTimeMs - receivedAtMs;
  const remainingMs = (ttlSeconds * 1000) - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Kiểm tra xem một offer có bị hết thời gian chờ 30s hay không
 */
export function isOfferExpired(
  offerOrExpiredAt: { expiredAt?: string; receivedAt?: number } | string,
  currentTimeMs = Date.now(),
  ttlSeconds = DRIVER_OFFER_TTL_SECONDS,
): boolean {
  return getRemainingOfferSeconds(offerOrExpiredAt, currentTimeMs, ttlSeconds) <= 0;
}
