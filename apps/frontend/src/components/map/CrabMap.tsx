import React, { useEffect } from 'react';
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LocationPoint } from '../../types/trip.types';
import { PickupDropoffMarkers } from './PickupDropoffMarkers';
import { RoutePolyline } from './RoutePolyline';
import { MovingVehicleMarker } from './MovingVehicleMarker';
import type { FleetEligibilityReason } from '../../utils/fleetSimulation.utils';

export interface NearbyDriverInfo {
  id: string;
  lat: number;
  lng: number;
  heading?: number;
  vehicleType?: 'BIKE' | 'CAR_4' | 'CAR_7' | string;
  driverName?: string;
  licensePlate?: string;
  eligible?: boolean;
  eligibilityReason?: FleetEligibilityReason;
  distanceMeters?: number;
  isSimulated?: boolean;
}

interface CrabMapProps {
  pickup?: LocationPoint | null;
  dropoff?: LocationPoint | null;
  routeGeometry?: [number, number][];
  driverLocation?: { lat: number; lng: number; heading?: number } | null;
  nearbyDrivers?: NearbyDriverInfo[];
  showMatchingRadius?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onPickupChange?: (lat: number, lng: number) => void;
  onDropoffChange?: (lat: number, lng: number) => void;
  className?: string;
}

const isValidCoord = (p?: LocationPoint | null): p is LocationPoint =>
  Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng));

// Controller tự động căn chỉnh khung hình theo lộ trình
const MapBoundsController: React.FC<{
  pickup?: LocationPoint | null;
  dropoff?: LocationPoint | null;
  routeGeometry?: [number, number][];
}> = ({ pickup, dropoff, routeGeometry }) => {
  const map = useMap();

  useEffect(() => {
    let bounds: L.LatLngBounds | null = null;

    if (routeGeometry && routeGeometry.length > 0) {
      const validGeometry = routeGeometry.filter(
        (pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])
      );
      if (validGeometry.length > 0) {
        bounds = L.latLngBounds(validGeometry);
      }
    } else {
      if (isValidCoord(pickup)) bounds = L.latLngBounds([[pickup.lat, pickup.lng]]);
      if (isValidCoord(dropoff)) {
        if (bounds) bounds.extend([dropoff.lat, dropoff.lng]);
        else bounds = L.latLngBounds([[dropoff.lat, dropoff.lng]]);
      }
    }

    if (bounds) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });
    } else if (isValidCoord(pickup)) {
      map.setView([pickup.lat, pickup.lng], 15, { animate: true });
    }
  }, [pickup, dropoff, routeGeometry, map]);

  return null;
};

// Lắng nghe sự kiện click trên bản đồ
const MapClickHandler: React.FC<{ onClick?: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      if (e.latlng && !isNaN(e.latlng.lat) && !isNaN(e.latlng.lng)) {
        onClick?.(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const CrabMap: React.FC<CrabMapProps> = ({
  pickup,
  dropoff,
  routeGeometry,
  driverLocation,
  nearbyDrivers,
  showMatchingRadius = false,
  onMapClick,
  onPickupChange,
  onDropoffChange,
  className = 'w-full h-full',
}) => {
  const centerCoord: [number, number] = isValidCoord(pickup)
    ? [pickup.lat, pickup.lng]
    : isValidCoord(dropoff)
    ? [dropoff.lat, dropoff.lng]
    : [10.776889, 106.700806]; // Tâm TP.HCM chỉ dùng để hiển thị khi chưa chọn điểm.

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <MapContainer
        center={centerCoord}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        {/* OpenStreetMap Tile Layer miễn phí */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Handlers & Auto-fit bounds */}
        <MapClickHandler onClick={onMapClick} />
        <MapBoundsController pickup={pickup} dropoff={dropoff} routeGeometry={routeGeometry} />

        {showMatchingRadius && isValidCoord(pickup) ? (
          <Circle
            center={[pickup.lat, pickup.lng]}
            radius={3000}
            pathOptions={{
              color: '#00B14F',
              fillColor: '#00B14F',
              fillOpacity: 0.035,
              opacity: 0.42,
              weight: 1.5,
              dashArray: '7 8',
            }}
          />
        ) : null}

        {/* Markers */}
        <PickupDropoffMarkers
          pickup={isValidCoord(pickup) ? pickup : undefined}
          dropoff={isValidCoord(dropoff) ? dropoff : undefined}
          onPickupChange={onPickupChange}
          onDropoffChange={onDropoffChange}
        />

        {/* OSRM Route Polyline */}
        {routeGeometry && <RoutePolyline coordinates={routeGeometry} />}

        {/* Live Assigned Moving Driver Marker */}
        {driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number' && !isNaN(driverLocation.lat) && !isNaN(driverLocation.lng) && (
          <MovingVehicleMarker position={driverLocation} />
        )}

        {/* Live Nearby Roaming Drivers Fleet */}
        {nearbyDrivers && nearbyDrivers.map((d) => (
          <MovingVehicleMarker
            key={d.id}
            position={{ lat: d.lat, lng: d.lng, heading: d.heading }}
            vehicleType={d.vehicleType || 'CAR_4'}
            driverName={d.driverName || 'Tài xế Crab'}
            licensePlate={d.licensePlate || '59A-123.45'}
            eligible={d.eligible}
            eligibilityReason={d.eligibilityReason}
            distanceMeters={d.distanceMeters}
            isSimulated={d.isSimulated}
          />
        ))}
      </MapContainer>
    </div>
  );
};
