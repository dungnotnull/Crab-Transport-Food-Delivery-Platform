export interface VehicleCoordinate {
  lat: number;
  lng: number;
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

/** Nội suy tuyến tính giữa hai lần cập nhật để marker không bị nhảy cóc. */
export function interpolateVehiclePosition(
  start: VehicleCoordinate,
  end: VehicleCoordinate,
  progress: number,
): VehicleCoordinate {
  const safeProgress = clampProgress(progress);

  return {
    lat: start.lat + (end.lat - start.lat) * safeProgress,
    lng: start.lng + (end.lng - start.lng) * safeProgress,
  };
}

/** Tính góc quay theo hướng di chuyển, giữ góc cũ khi xe đứng yên. */
export function calculateVehicleHeading(
  start: VehicleCoordinate,
  end: VehicleCoordinate,
  fallbackHeading = 0,
): number {
  const latDelta = end.lat - start.lat;
  const lngDelta = end.lng - start.lng;

  if (Math.abs(latDelta) < Number.EPSILON && Math.abs(lngDelta) < Number.EPSILON) {
    return Number.isFinite(fallbackHeading) ? ((fallbackHeading % 360) + 360) % 360 : 0;
  }

  const meanLatitudeRadians = ((start.lat + end.lat) / 2) * (Math.PI / 180);
  const heading = Math.atan2(
    lngDelta * Math.cos(meanLatitudeRadians),
    latDelta,
  ) * (180 / Math.PI);

  return Number.isFinite(heading) ? (heading + 360) % 360 : 0;
}
