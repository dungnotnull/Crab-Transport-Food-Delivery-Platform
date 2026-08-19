import React from 'react';
import { Polyline } from 'react-leaflet';

interface RoutePolylineProps {
  coordinates: [number, number][];
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({ coordinates }) => {
  if (!coordinates || coordinates.length < 2) return null;

  return (
    <>
      {/* Outer Glowing Casing */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: 'rgba(0, 177, 79, 0.3)',
          weight: 9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Inner Crisp Primary Route */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: '#00B14F',
          weight: 5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
};
