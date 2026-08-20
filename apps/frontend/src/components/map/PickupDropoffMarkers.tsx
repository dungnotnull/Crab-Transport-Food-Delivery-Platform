import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LocationPoint } from '../../types/trip.types';

interface PickupDropoffMarkersProps {
  pickup?: LocationPoint;
  dropoff?: LocationPoint | null;
  onPickupChange?: (lat: number, lng: number) => void;
  onDropoffChange?: (lat: number, lng: number) => void;
}

// Icon điểm đón (Xanh lá Crab với hiệu ứng pulse)
const pickupIcon = L.divIcon({
  className: 'custom-pickup-marker',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <span class="absolute w-8 h-8 bg-emerald-500 rounded-full opacity-40 animate-ping"></span>
      <div class="relative w-7 h-7 bg-[#00B14F] border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
        <span class="text-xs font-black">A</span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Icon điểm đến (Đỏ Crab)
const dropoffIcon = L.divIcon({
  className: 'custom-dropoff-marker',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="w-7 h-7 bg-[#EF4444] border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
        <span class="text-xs font-black">B</span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const PickupDropoffMarkers: React.FC<PickupDropoffMarkersProps> = ({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
}) => {
  return (
    <>
      {/* Pickup Marker */}
      {pickup && (
        <Marker
          position={[pickup.lat, pickup.lng]}
        icon={pickupIcon}
        draggable={!!onPickupChange}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onPickupChange?.(position.lat, position.lng);
          },
        }}
      >
        <Popup className="custom-popup">
          <div className="text-xs font-semibold text-slate-800 p-1">
            <span className="text-[#00B14F] font-bold">📍 Điểm đón:</span>
            <p className="mt-0.5 text-slate-600">{pickup.address || 'Điểm đón đã chọn'}</p>
          </div>
        </Popup>
      </Marker>
      )}

      {/* Dropoff Marker */}
      {dropoff && (
        <Marker
          position={[dropoff.lat, dropoff.lng]}
          icon={dropoffIcon}
          draggable={!!onDropoffChange}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              onDropoffChange?.(position.lat, position.lng);
            },
          }}
        >
          <Popup className="custom-popup">
            <div className="text-xs font-semibold text-slate-800 p-1">
              <span className="text-[#EF4444] font-bold">🎯 Điểm đến:</span>
              <p className="mt-0.5 text-slate-600">{dropoff.address || 'Điểm đến đã chọn'}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};
