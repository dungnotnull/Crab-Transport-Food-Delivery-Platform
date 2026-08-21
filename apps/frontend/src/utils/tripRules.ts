import type { LocationPoint, TripStatus } from '../types/trip.types';

const CUSTOMER_CANCELLABLE_STATUSES = new Set<TripStatus>([
  'FINDING_DRIVER',
  'ACCEPTED',
]);

/** Khóa một request đang chạy để thao tác nhận cuốc không bị gửi lặp. */
export class SingleFlightGate {
  private isLocked = false;

  async run<TResult>(task: () => Promise<TResult>): Promise<TResult | undefined> {
    if (this.isLocked) return undefined;

    this.isLocked = true;
    try {
      return await task();
    } finally {
      this.isLocked = false;
    }
  }
}

export function canCustomerCancel(status: TripStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.has(status);
}

export function canPreviewRoute(
  pickup: LocationPoint | null,
  dropoff: LocationPoint | null,
): boolean {
  return Boolean(pickup && dropoff);
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
