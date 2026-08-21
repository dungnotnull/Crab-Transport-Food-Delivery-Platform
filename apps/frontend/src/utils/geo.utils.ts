import { LocationPoint } from '../types/trip.types';

// Các điểm đến phổ biến gợi ý
export const POPULAR_DESTINATIONS: LocationPoint[] = [
  {
    lat: 10.7725,
    lng: 106.698,
    address: 'Chợ Bến Thành, Quận 1, TP. Hồ Chí Minh',
  },
  {
    lat: 10.795,
    lng: 106.7218,
    address: 'Landmark 81, Vinhomes Central Park, Bình Thạnh',
  },
  {
    lat: 10.7719,
    lng: 106.7044,
    address: 'Bitexco Financial Tower, Quận 1, TP. Hồ Chí Minh',
  },
  {
    lat: 10.8185,
    lng: 106.6588,
    address: 'Sân bay Quốc tế Tân Sơn Nhất, Tân Bình',
  },
];

/**
 * Format khoảng cách sang km hoặc mét
 */
export function formatDistance(meters?: number): string {
  if (!meters || meters < 0) return '0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format thời gian di chuyển (giây -> phút)
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return '1 phút';
  const mins = Math.ceil(seconds / 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours} giờ ${remainMins > 0 ? `${remainMins}p` : ''}`;
  }
  return `${mins} phút`;
}
