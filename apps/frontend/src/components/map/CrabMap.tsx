import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LocationPoint } from '../../types/trip.types';
import { PickupDropoffMarkers } from './PickupDropoffMarkers';
import { RoutePolyline } from './RoutePolyline';
import { MovingVehicleMarker } from './MovingVehicleMarker';

interface CrabMapProps {
  pickup: LocationPoint;
  dropoff?: LocationPoint | null;
  routeGeometry?: [number, number][];
  driverLocation?: { lat: number; lng: number; heading?: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  onPickupChange?: (lat: number, lng: number) => void;
  onDropoffChange?: (lat: number, lng: number) => void;
  className?: string;
}

// Controller tự động căn chỉnh khung hình theo lộ trình
const MapBoundsController: React.FC<{
  pickup: LocationPoint;
  dropoff?: LocationPoint | null;
  routeGeometry?: [number, number][];
}> = ({ pickup, dropoff, routeGeometry }) => {
  const map = useMap();

  useEffect(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      const bounds = L.latLngBounds(routeGeometry);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });
    } else if (dropoff) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ]);
      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 16,
        animate: true,
      });
    } else {
      map.setView([pickup.lat, pickup.lng], 15, { animate: true });
    }
  }, [pickup, dropoff, routeGeometry, map]);

  return null;
};

// Lắng nghe sự kiện click trên bản đồ
const MapClickHandler: React.FC<{ onClick?: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const CrabMap: React.FC<CrabMapProps> = ({
  pickup,
  dropoff,
  routeGeometry,
  driverLocation,
  onMapClick,
  onPickupChange,
  onDropoffChange,
  className = 'w-full h-full',
}) => {
  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <MapContainer
        center={[pickup.lat, pickup.lng]}
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

        {/* Markers */}
        <PickupDropoffMarkers
          pickup={pickup}
          dropoff={dropoff}
          onPickupChange={onPickupChange}
          onDropoffChange={onDropoffChange}
        />

        {/* OSRM Route Polyline */}
        {routeGeometry && <RoutePolyline coordinates={routeGeometry} />}

        {/* Live Moving Driver Marker */}
        {driverLocation && <MovingVehicleMarker position={driverLocation} />}
      </MapContainer>
    </div>
  );
};
