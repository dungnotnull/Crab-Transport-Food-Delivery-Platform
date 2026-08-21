import type { DriverLocationUpdatePayload } from '../types/socket.types';
import type { LocationPoint, TripStatus } from '../types/trip.types';
import * as turf from '@turf/turf';
import {
  calculateVehicleHeading,
  interpolateVehiclePosition,
} from './vehicleMotion.utils.ts';

export const DRIVER_SIMULATION_SPEEDS = [1, 2, 5] as const;
export type DriverSimulationSpeed = (typeof DRIVER_SIMULATION_SPEEDS)[number];
export type DriverSimulationPhase = 'TO_PICKUP' | 'TO_DROPOFF';
export type DriverSimulationStatus = Extract<
  TripStatus,
  | 'ARRIVED_AT_PICKUP'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'COMPLETED'
>;

export type DriverSimulationAction =
  | {
      type: 'LOCATION';
      phase: DriverSimulationPhase;
      progress: number;
      payload: DriverLocationUpdatePayload;
    }
  | {
      type: 'STATUS';
      status: DriverSimulationStatus;
    };

export type DriverSimulationRunResult = 'COMPLETED' | 'CANCELLED';

interface RunDriverTripSimulationOptions {
  speed: DriverSimulationSpeed;
  signal?: AbortSignal;
  onLocation: (
    payload: DriverLocationUpdatePayload,
    action: Extract<DriverSimulationAction, { type: 'LOCATION' }>,
  ) => void | Promise<void>;
  onStatus: (status: DriverSimulationStatus) => void | Promise<void>;
  onProgress?: (
    completedActions: number,
    totalActions: number,
    action: DriverSimulationAction,
  ) => void;
  wait?: (durationMs: number) => Promise<void>;
}

const LOCATION_TICK_MS = 1200;
const PICKUP_PAUSE_MS = 1800;
const DESTINATION_PAUSE_MS = 900;

export function shouldSyncLiveDriverLocation(
  isOnline: boolean,
  isSimulatingTrip: boolean,
): boolean {
  return isOnline && !isSimulatingTrip;
}

export function isEventForActiveTrip(
  activeTripId: string | null,
  eventTripId: unknown,
): eventTripId is string {
  return (
    typeof eventTripId === 'string' &&
    eventTripId.length > 0 &&
    eventTripId === activeTripId
  );
}

interface CreateDriverTripSimulationPlanInput {
  tripId: string;
  status: TripStatus;
  currentLocation: Pick<LocationPoint, 'lat' | 'lng'>;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  dropoffRoute?: ReadonlyArray<readonly [number, number]>;
  stepsPerLeg?: number;
}

function normalizeHeading(heading?: number): number | undefined {
  if (!Number.isFinite(heading)) return undefined;
  return (((heading as number) % 360) + 360) % 360;
}

export function createDriverLocationUpdatePayload(
  tripId: string,
  point: { lat: number; lng: number; heading?: number },
): DriverLocationUpdatePayload {
  const heading = normalizeHeading(point.heading);

  return {
    tripId,
    lat: point.lat,
    lng: point.lng,
    ...(heading === undefined ? {} : { heading }),
  };
}

function createLocationActions(
  tripId: string,
  start: Pick<LocationPoint, 'lat' | 'lng'>,
  end: Pick<LocationPoint, 'lat' | 'lng'>,
  phase: DriverSimulationPhase,
  stepsPerLeg: number,
): DriverSimulationAction[] {
  const heading = calculateVehicleHeading(start, end);

  return Array.from({ length: stepsPerLeg }, (_, index) => {
    const progress = (index + 1) / stepsPerLeg;
    const point = interpolateVehiclePosition(start, end, progress);

    return {
      type: 'LOCATION' as const,
      phase,
      progress,
      payload: createDriverLocationUpdatePayload(tripId, {
        ...point,
        heading,
      }),
    };
  });
}

function createRouteLocationActions(
  tripId: string,
  start: Pick<LocationPoint, 'lat' | 'lng'>,
  end: Pick<LocationPoint, 'lat' | 'lng'>,
  phase: DriverSimulationPhase,
  stepsPerLeg: number,
  route?: ReadonlyArray<readonly [number, number]>,
): DriverSimulationAction[] {
  const validRoute = route?.filter(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );

  if (!validRoute || validRoute.length < 2) {
    return createLocationActions(tripId, start, end, phase, stepsPerLeg);
  }

  const line = turf.lineString(
    validRoute.map(([lat, lng]) => [lng, lat]),
  );
  const routeLengthKm = turf.length(line, { units: 'kilometers' });
  if (!Number.isFinite(routeLengthKm) || routeLengthKm <= 0) {
    return createLocationActions(tripId, start, end, phase, stepsPerLeg);
  }

  // Khi tiếp tục một cuốc đang chạy, lấy phần tuyến từ điểm gần xe nhất để không quay ngược về pickup.
  const nearest = turf.nearestPointOnLine(
    line,
    turf.point([start.lng, start.lat]),
    { units: 'kilometers' },
  );
  const nearestDistanceKm = Number(nearest.properties.location ?? 0);
  const routeStartKm = Math.min(
    routeLengthKm,
    Math.max(0, Number.isFinite(nearestDistanceKm) ? nearestDistanceKm : 0),
  );
  let previousPoint = start;

  return Array.from({ length: stepsPerLeg }, (_, index) => {
    const progress = (index + 1) / stepsPerLeg;
    const distanceKm = routeStartKm + (routeLengthKm - routeStartKm) * progress;
    const [lng, lat] = turf.along(line, distanceKm, {
      units: 'kilometers',
    }).geometry.coordinates;
    const heading = turf.bearing(
      [previousPoint.lng, previousPoint.lat],
      [lng, lat],
    );
    previousPoint = { lat, lng };

    return {
      type: 'LOCATION' as const,
      phase,
      progress,
      payload: createDriverLocationUpdatePayload(tripId, {
        lat,
        lng,
        heading,
      }),
    };
  });
}

export function createDriverTripSimulationPlan({
  tripId,
  status,
  currentLocation,
  pickup,
  dropoff,
  dropoffRoute,
  stepsPerLeg = 12,
}: CreateDriverTripSimulationPlanInput): DriverSimulationAction[] {
  const safeStepsPerLeg = Math.max(1, Math.floor(stepsPerLeg));
  const actions: DriverSimulationAction[] = [];

  if (status === 'ACCEPTED') {
    actions.push(
      ...createLocationActions(
        tripId,
        currentLocation,
        pickup,
        'TO_PICKUP',
        safeStepsPerLeg,
      ),
      { type: 'STATUS', status: 'ARRIVED_AT_PICKUP' },
      { type: 'STATUS', status: 'IN_TRANSIT' },
    );
  }

  if (
    status === 'ACCEPTED' ||
    status === 'ARRIVED_AT_PICKUP' ||
    status === 'IN_TRANSIT'
  ) {
    const dropoffStart = status === 'IN_TRANSIT' ? currentLocation : pickup;

    if (status === 'ARRIVED_AT_PICKUP') {
      actions.push({ type: 'STATUS', status: 'IN_TRANSIT' });
    }

    actions.push(
      ...createRouteLocationActions(
        tripId,
        dropoffStart,
        dropoff,
        'TO_DROPOFF',
        safeStepsPerLeg,
        dropoffRoute,
      ),
      { type: 'STATUS', status: 'ARRIVED_AT_DESTINATION' },
      { type: 'STATUS', status: 'COMPLETED' },
    );
  } else if (status === 'ARRIVED_AT_DESTINATION') {
    actions.push({ type: 'STATUS', status: 'COMPLETED' });
  }

  return actions;
}

function waitForDelay(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function getDelayAfterAction(action: DriverSimulationAction): number {
  if (action.type === 'LOCATION') return LOCATION_TICK_MS;
  if (action.status === 'ARRIVED_AT_PICKUP') return PICKUP_PAUSE_MS;
  if (action.status === 'ARRIVED_AT_DESTINATION') return DESTINATION_PAUSE_MS;
  return 0;
}

export async function runDriverTripSimulationPlan(
  actions: DriverSimulationAction[],
  {
    speed,
    signal,
    onLocation,
    onStatus,
    onProgress,
    wait = waitForDelay,
  }: RunDriverTripSimulationOptions,
): Promise<DriverSimulationRunResult> {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;

  for (const [index, action] of actions.entries()) {
    if (signal?.aborted) return 'CANCELLED';

    if (action.type === 'LOCATION') {
      await onLocation(action.payload, action);
    } else {
      await onStatus(action.status);
    }

    if (signal?.aborted) return 'CANCELLED';
    onProgress?.(index + 1, actions.length, action);

    const delayMs = getDelayAfterAction(action);
    if (delayMs > 0) {
      await wait(delayMs / safeSpeed);
    }
  }

  return signal?.aborted ? 'CANCELLED' : 'COMPLETED';
}
