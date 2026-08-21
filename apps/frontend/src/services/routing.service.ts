import type { LocationPoint } from '../types/trip.types';

const PUBLIC_OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: unknown[];
    };
  }>;
}

function assertFinitePoint(point: Pick<LocationPoint, 'lat' | 'lng'>): void {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    throw new Error('OSRM không thể định tuyến tọa độ không hợp lệ');
  }
}

function normalizeGeometry(data: OsrmRouteResponse): Array<[number, number]> {
  const geometry = data.routes?.[0]?.geometry;
  if (data.code !== 'Ok' || geometry?.type !== 'LineString') {
    throw new Error('OSRM chưa trả về tuyến đường hợp lệ');
  }

  const normalized = (geometry.coordinates ?? []).flatMap((coordinate) => {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      !Number.isFinite(coordinate[0]) ||
      !Number.isFinite(coordinate[1])
    ) {
      return [];
    }

    return [[Number(coordinate[1]), Number(coordinate[0])] as [number, number]];
  });

  if (normalized.length < 2) {
    throw new Error('OSRM chưa trả về đủ điểm trên tuyến đường');
  }

  return normalized;
}

export const routingService = {
  async getRouteGeometry(
    start: Pick<LocationPoint, 'lat' | 'lng'>,
    end: Pick<LocationPoint, 'lat' | 'lng'>,
    signal?: AbortSignal,
  ): Promise<Array<[number, number]>> {
    assertFinitePoint(start);
    assertFinitePoint(end);

    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const url = new URL(`${PUBLIC_OSRM_ROUTE_URL}/${coordinates}`);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('steps', 'false');

    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`OSRM trả về HTTP ${response.status}`);
    }

    return normalizeGeometry((await response.json()) as OsrmRouteResponse);
  },
};
