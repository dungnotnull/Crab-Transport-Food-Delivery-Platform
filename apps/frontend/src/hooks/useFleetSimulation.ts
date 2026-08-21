import { useEffect, useMemo, useState } from 'react';
import type { LocationPoint, ServiceType } from '../types/trip.types';
import {
  advanceSimulatedFleet,
  createDisplayedFleet,
  createSimulatedFleet,
  type DisplayedDriver,
} from '../utils/fleetSimulation.utils';

export function useFleetSimulation(
  pickup: LocationPoint | null,
  serviceType: ServiceType,
  enabled: boolean,
): DisplayedDriver[] {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const baseFleet = useMemo(
    () => pickup ? createSimulatedFleet(pickup) : [],
    [pickup?.lat, pickup?.lng],
  );

  useEffect(() => {
    setElapsedSeconds(0);
  }, [pickup?.lat, pickup?.lng]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!enabled || !pickup || prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1.2);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [enabled, pickup?.lat, pickup?.lng, prefersReducedMotion]);

  return useMemo(() => {
    if (!enabled || !pickup) return [];

    const movingFleet = prefersReducedMotion
      ? baseFleet
      : advanceSimulatedFleet(baseFleet, pickup, elapsedSeconds);
    return createDisplayedFleet(movingFleet, pickup, serviceType);
  }, [
    baseFleet,
    elapsedSeconds,
    enabled,
    pickup?.lat,
    pickup?.lng,
    prefersReducedMotion,
    serviceType,
  ]);
}
