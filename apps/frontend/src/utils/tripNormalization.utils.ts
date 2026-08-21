import type { LocationPoint, Trip } from '../types/trip.types';

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isCoordinateInRange(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Chuẩn hóa tọa độ API và từ chối dữ liệu lỗi thay vì dựng vị trí giả. */
export function normalizeLocationPoint(
  point: unknown,
  fallbackAddress = 'Địa chỉ',
): LocationPoint {
  if (!point || typeof point !== 'object') {
    throw new Error(`Dữ liệu tọa độ ${fallbackAddress.toLowerCase()} không hợp lệ`);
  }

  const rawPoint = point as Record<string, unknown>;
  const directLat = toFiniteNumber(rawPoint.lat);
  const directLng = toFiniteNumber(rawPoint.lng);

  if (
    directLat !== null &&
    directLng !== null &&
    isCoordinateInRange(directLat, directLng)
  ) {
    return {
      lat: directLat,
      lng: directLng,
      address: typeof rawPoint.address === 'string' && rawPoint.address.trim()
        ? rawPoint.address
        : fallbackAddress,
    };
  }

  if (Array.isArray(rawPoint.coordinates) && rawPoint.coordinates.length >= 2) {
    const lng = toFiniteNumber(rawPoint.coordinates[0]);
    const lat = toFiniteNumber(rawPoint.coordinates[1]);

    if (lat !== null && lng !== null && isCoordinateInRange(lat, lng)) {
      return {
        lat,
        lng,
        address: typeof rawPoint.address === 'string' && rawPoint.address.trim()
          ? rawPoint.address
          : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
    }
  }

  throw new Error(`Dữ liệu tọa độ ${fallbackAddress.toLowerCase()} không hợp lệ`);
}

/** Chuẩn hóa Trip theo contract backend; dữ liệu thiếu sẽ đi vào error state của UI. */
export function normalizeTrip(data: unknown): Trip {
  if (!data || typeof data !== 'object') {
    throw new Error('Dữ liệu chuyến đi không hợp lệ');
  }

  const rawTrip = data as Record<string, unknown>;
  const pickup = normalizeLocationPoint(rawTrip.pickup_location, 'Điểm đón');
  const dropoff = normalizeLocationPoint(rawTrip.dropoff_location, 'Điểm đến');
  const totalFare = toFiniteNumber(rawTrip.total_fare ?? rawTrip.fare);

  if (totalFare === null) {
    throw new Error('Dữ liệu cước chuyến đi không hợp lệ');
  }

  return {
    ...rawTrip,
    total_fare: totalFare,
    pickup_location: pickup,
    dropoff_location: dropoff,
  } as Trip;
}
