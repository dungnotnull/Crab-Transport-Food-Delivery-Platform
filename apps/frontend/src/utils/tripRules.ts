import type { TripStatus } from '../types/trip.types';

const CUSTOMER_CANCELLABLE_STATUSES = new Set<TripStatus>([
  'FINDING_DRIVER',
  'ACCEPTED',
]);

export function canCustomerCancel(status: TripStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.has(status);
}

export function isTripAcceptConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 409,
  );
}

export function getTripAcceptErrorMessage(error: unknown): string {
  return isTripAcceptConflict(error)
    ? 'Cuốc xe đã được tài xế khác tiếp nhận!'
    : 'Không thể nhận cuốc. Vui lòng thử lại.';
}
