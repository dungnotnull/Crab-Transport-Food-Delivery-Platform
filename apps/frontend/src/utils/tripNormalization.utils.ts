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

/** Chuẩn hóa geometry Backend sang cặp Leaflet [lat, lng] và từ chối point bị lỗi. */
export function normalizeRouteGeometry(geometry: unknown): [number, number][] {
  if (geometry === null || geometry === undefined) return [];

  const isGeoJson = !Array.isArray(geometry);
  const coordinates = Array.isArray(geometry)
    ? geometry
    : geometry && typeof geometry === 'object'
      ? (geometry as Record<string, unknown>).coordinates
      : null;

  if (!Array.isArray(coordinates)) {
    throw new Error('Dữ liệu hình học tuyến đường không hợp lệ');
  }

  return coordinates.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new Error('Dữ liệu hình học tuyến đường không hợp lệ');
    }

    const first = toFiniteNumber(point[0]);
    const second = toFiniteNumber(point[1]);
    if (first === null || second === null) {
      throw new Error('Dữ liệu hình học tuyến đường không hợp lệ');
    }

    const shouldReverse = isGeoJson || (first > 50 && second >= -90 && second <= 90);
    const lat = shouldReverse ? second : first;
    const lng = shouldReverse ? first : second;
    if (!isCoordinateInRange(lat, lng)) {
      throw new Error('Dữ liệu hình học tuyến đường không hợp lệ');
    }

    return [lat, lng] as [number, number];
  });
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
