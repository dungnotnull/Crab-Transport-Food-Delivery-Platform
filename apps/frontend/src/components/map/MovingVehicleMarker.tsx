import { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatDistance } from '../../utils/geo.utils';
import type { FleetEligibilityReason } from '../../utils/fleetSimulation.utils';
import {
  calculateVehicleHeading,
  interpolateVehiclePosition,
  type VehicleCoordinate,
} from '../../utils/vehicleMotion.utils';

interface MovingVehicleMarkerProps {
  position: { lat: number; lng: number; heading?: number };
  vehicleType?: 'CAR_4' | 'CAR_7' | string;
  driverName?: string;
  licensePlate?: string;
  eligible?: boolean;
  eligibilityReason?: FleetEligibilityReason;
  distanceMeters?: number;
  isSimulated?: boolean;
}

const MOVEMENT_DURATION_MS = 1100;

function isValidPosition(position: VehicleCoordinate): boolean {
  return Number.isFinite(position.lat) && Number.isFinite(position.lng);
}

export function MovingVehicleMarker({
  position,
  vehicleType = 'CAR_4',
  driverName = 'Tài xế',
  licensePlate = 'Chưa cập nhật',
  eligible,
  eligibilityReason,
  distanceMeters,
  isSimulated = false,
}: MovingVehicleMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderedPositionRef = useRef<VehicleCoordinate>({
    lat: position.lat,
    lng: position.lng,
  });
  const previousTargetRef = useRef<VehicleCoordinate>({
    lat: position.lat,
    lng: position.lng,
  });
  const previousHeadingRef = useRef(Number.isFinite(position.heading) ? position.heading ?? 0 : 0);

  const targetPosition = useMemo(
    () => ({ lat: position.lat, lng: position.lng }),
    [position.lat, position.lng],
  );
  const calculatedHeading = calculateVehicleHeading(
    previousTargetRef.current,
    targetPosition,
    previousHeadingRef.current,
  );
  const heading = Number.isFinite(position.heading)
    ? ((position.heading ?? 0) + 360) % 360
    : calculatedHeading;
  previousHeadingRef.current = heading;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !isValidPosition(targetPosition)) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const startPosition = { ...renderedPositionRef.current };
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof window.requestAnimationFrame !== 'function') {
      marker.setLatLng(targetPosition);
      renderedPositionRef.current = targetPosition;
      previousTargetRef.current = targetPosition;
      return;
    }

    const startedAt = performance.now();
    const animate = (now: number) => {
      const linearProgress = Math.min(1, (now - startedAt) / MOVEMENT_DURATION_MS);
      const easedProgress = 1 - (1 - linearProgress) ** 3;
      const nextPosition = interpolateVehiclePosition(
        startPosition,
        targetPosition,
        easedProgress,
      );

      marker.setLatLng(nextPosition);
      renderedPositionRef.current = nextPosition;

      if (linearProgress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        previousTargetRef.current = targetPosition;
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetPosition]);

  const vehicleIcon = useMemo(() => {
    let bgClass = 'bg-teal-600';
    let iconSvg = '<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>';

    if (vehicleType === 'BIKE') {
      bgClass = 'bg-emerald-600';
      iconSvg = '<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';
    } else if (vehicleType === 'CAR_7') {
      bgClass = 'bg-blue-600';
      iconSvg = '<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8h-1V6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8c0-1.1-.9-2-2-2zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6 9V6h12v3H6z"/></svg>';
    }

    if (isSimulated && eligible === false) bgClass = 'bg-slate-500';
    if (isSimulated && eligible === true) bgClass = 'bg-[#00B14F]';

    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div class="relative flex h-10 w-10 items-center justify-center ${isSimulated && eligible === false ? 'opacity-60' : ''}" style="transform: rotate(${heading}deg); transition: transform 300ms ease-out;">
          <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white ${bgClass} shadow-xl">
            ${iconSvg}
          </div>
          <div class="absolute -top-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-400 shadow-sm"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [eligible, heading, isSimulated, vehicleType]);

  if (!isValidPosition(targetPosition)) return null;

  const simulationStatus = eligibilityReason === 'OUT_OF_RADIUS'
    ? 'Ngoài phạm vi 3 km'
    : eligibilityReason === 'VEHICLE_TYPE'
      ? 'Không cùng loại xe'
      : 'Có thể nhận cuốc mô phỏng';

  return (
    <Marker
      ref={markerRef}
      position={[renderedPositionRef.current.lat, renderedPositionRef.current.lng]}
      icon={vehicleIcon}
    >
      <Popup>
        <div className="p-1 text-xs font-bold">
          <p className="text-[#00B14F]">{driverName}</p>
          <p className="font-medium text-slate-500">BS: {licensePlate}</p>
          {isSimulated ? (
            <>
              <p className={eligible ? 'mt-1 text-emerald-700' : 'mt-1 text-slate-500'}>
                {simulationStatus}
              </p>
              {typeof distanceMeters === 'number' ? (
                <p className="text-slate-400">Cách điểm đón {formatDistance(distanceMeters)}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}
