import * as turf from '@turf/turf';
import type { LocationPoint, ServiceType } from '../types/trip.types';

export const MATCHING_RADIUS_METERS = 3000;

export type FleetEligibilityReason =
  | 'ELIGIBLE'
  | 'OUT_OF_RADIUS'
  | 'VEHICLE_TYPE';

export interface FleetDriverPosition {
  id: string;
  lat: number;
  lng: number;
  vehicleType: ServiceType;
  heading?: number;
  driverName?: string;
  licensePlate?: string;
}

export interface SimulatedDriver extends FleetDriverPosition {
  radialKm: number;
  baseBearing: number;
  direction: 1 | -1;
  angularSpeed: number;
}

export interface FleetEligibility {
  eligible: boolean;
  reason: FleetEligibilityReason;
  distanceMeters: number;
}

export interface DisplayedDriver extends SimulatedDriver, FleetEligibility {
  isSimulated: true;
}

const FLEET_TEMPLATES = [
  { id: 'sim-bike-1', vehicleType: 'BIKE', radialKm: 0.7, baseBearing: 25, direction: 1, driverName: 'Minh • CrabBike', licensePlate: '59P1-889.12' },
  { id: 'sim-bike-2', vehicleType: 'BIKE', radialKm: 3.8, baseBearing: 210, direction: -1, driverName: 'Nam • CrabBike', licensePlate: '59N2-456.78' },
  { id: 'sim-car4-1', vehicleType: 'CAR_4', radialKm: 1.3, baseBearing: 100, direction: 1, driverName: 'Tuấn • CrabCar 4', licensePlate: '51H-678.90' },
  { id: 'sim-car4-2', vehicleType: 'CAR_4', radialKm: 4.6, baseBearing: 300, direction: -1, driverName: 'Hải • CrabCar 4', licensePlate: '51K-123.45' },
  { id: 'sim-car7-1', vehicleType: 'CAR_7', radialKm: 2.4, baseBearing: 165, direction: 1, driverName: 'Long • CrabCar 7', licensePlate: '59A-999.88' },
  { id: 'sim-car7-2', vehicleType: 'CAR_7', radialKm: 5.2, baseBearing: 340, direction: -1, driverName: 'An • CrabCar 7', licensePlate: '50H-246.80' },
] as const;

function destinationFromPickup(
  pickup: LocationPoint,
  radialKm: number,
  bearing: number,
): { lat: number; lng: number } {
  const [lng, lat] = turf.destination(
    [pickup.lng, pickup.lat],
    radialKm,
    bearing,
    { units: 'kilometers' },
  ).geometry.coordinates;

  return { lat, lng };
}

export function createSimulatedFleet(pickup: LocationPoint): SimulatedDriver[] {
  return FLEET_TEMPLATES.map((template, index) => ({
    ...template,
    ...destinationFromPickup(pickup, template.radialKm, template.baseBearing),
    direction: template.direction as 1 | -1,
    angularSpeed: 1.7 + index * 0.16,
    heading: (template.baseBearing + template.direction * 90 + 360) % 360,
  }));
}

export function advanceSimulatedFleet(
  fleet: SimulatedDriver[],
  pickup: LocationPoint,
  elapsedSeconds: number,
): SimulatedDriver[] {
  return fleet.map((driver) => {
    const bearing = (
      driver.baseBearing +
      driver.direction * driver.angularSpeed * elapsedSeconds +
      3600
    ) % 360;

    return {
      ...driver,
      ...destinationFromPickup(pickup, driver.radialKm, bearing),
      heading: (bearing + driver.direction * 90 + 360) % 360,
    };
  });
}

export function getFleetEligibility(
  driver: FleetDriverPosition,
  pickup: LocationPoint,
  serviceType: ServiceType,
): FleetEligibility {
  const distanceMeters = turf.distance(
    [pickup.lng, pickup.lat],
    [driver.lng, driver.lat],
    { units: 'meters' },
  );

  if (distanceMeters > MATCHING_RADIUS_METERS + 0.5) {
    return { eligible: false, reason: 'OUT_OF_RADIUS', distanceMeters };
  }

  if (driver.vehicleType !== serviceType) {
    return { eligible: false, reason: 'VEHICLE_TYPE', distanceMeters };
  }

  return { eligible: true, reason: 'ELIGIBLE', distanceMeters };
}

export function createDisplayedFleet(
  fleet: SimulatedDriver[],
  pickup: LocationPoint,
  serviceType: ServiceType,
): DisplayedDriver[] {
  return fleet.map((driver) => ({
    ...driver,
    ...getFleetEligibility(driver, pickup, serviceType),
    isSimulated: true,
  }));
}
