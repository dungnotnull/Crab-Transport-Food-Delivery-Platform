import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatDistance } from '../../utils/geo.utils';
import type { FleetEligibilityReason } from '../../utils/fleetSimulation.utils';

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

export const MovingVehicleMarker: React.FC<MovingVehicleMarkerProps> = ({
  position,
  vehicleType = 'CAR_4',
  driverName = 'Tài xế CrabCar',
  licensePlate = '51H-888.88',
  eligible,
  eligibilityReason,
  distanceMeters,
  isSimulated = false,
}) => {
  if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number' || isNaN(position.lat) || isNaN(position.lng)) {
    return null;
  }

  const heading = position.heading || 0;

  let bgClass = 'bg-[#00B14F]';
  let iconSvg = '';

  if (vehicleType === 'BIKE') {
    bgClass = 'bg-emerald-600';
    iconSvg = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
  } else if (vehicleType === 'CAR_7') {
    bgClass = 'bg-blue-600';
    iconSvg = `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8h-1V6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8c0-1.1-.9-2-2-2zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6 9V6h12v3H6z"/></svg>`;
  } else {
    // CAR_4 default
    bgClass = 'bg-teal-600';
    iconSvg = `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
  }

  if (isSimulated && eligible === false) {
    bgClass = 'bg-slate-500';
  } else if (isSimulated && eligible === true) {
    bgClass = 'bg-[#00B14F]';
  }

  const simulationStatus = eligibilityReason === 'OUT_OF_RADIUS'
    ? 'Ngoài phạm vi 3 km'
    : eligibilityReason === 'VEHICLE_TYPE'
    ? 'Không cùng loại xe'
    : 'Có thể nhận cuốc mô phỏng';

  const vehicleIcon = L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="relative w-10 h-10 flex items-center justify-center transform transition-transform duration-500 ease-out ${isSimulated && eligible === false ? 'opacity-60' : ''}" style="transform: rotate(${heading}deg);">
        <div class="w-8 h-8 ${bgClass} border-2 border-white rounded-full shadow-xl flex items-center justify-center">
          ${iconSvg}
        </div>
        <div class="absolute -top-1 w-2.5 h-2.5 bg-amber-400 border border-white rounded-full shadow-sm"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <Marker position={[position.lat, position.lng]} icon={vehicleIcon}>
      <Popup>
        <div className="text-xs font-bold p-1">
          <p className="text-[#00B14F]">{driverName}</p>
          <p className="text-slate-500 font-medium">BS: {licensePlate}</p>
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
};
