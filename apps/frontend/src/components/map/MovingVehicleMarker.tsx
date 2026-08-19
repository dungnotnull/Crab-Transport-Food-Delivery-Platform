import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface MovingVehicleMarkerProps {
  position: { lat: number; lng: number; heading?: number };
  vehicleType?: 'BIKE' | 'CAR';
  driverName?: string;
  licensePlate?: string;
}

export const MovingVehicleMarker: React.FC<MovingVehicleMarkerProps> = ({
  position,
  vehicleType = 'BIKE',
  driverName = 'Tài xế Crab',
  licensePlate = '59P1-88888',
}) => {
  const heading = position.heading || 0;

  const iconSvg =
    vehicleType === 'BIKE'
      ? `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>`
      : `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

  const vehicleIcon = L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="relative w-10 h-10 flex items-center justify-center transform transition-transform duration-500 ease-out" style="transform: rotate(${heading}deg);">
        <div class="w-8 h-8 bg-emerald-600 border-2 border-white rounded-full shadow-xl flex items-center justify-center">
          ${iconSvg}
        </div>
        <div class="absolute -top-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm"></div>
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
        </div>
      </Popup>
    </Marker>
  );
};
