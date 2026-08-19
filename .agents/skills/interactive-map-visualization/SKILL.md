---
name: interactive-map-visualization
description: Expert guidance for designing and engineering high-aesthetic Leaflet.js, OpenStreetMap, and Turf.js GIS experiences with custom rotating vehicle SVG markers, glowing route polylines, dynamic map bounds, and zero-leak lifecycle management.
license: MIT
---

# Interactive Map & GIS Visualization Mastery

In on-demand transportation apps (Grab, Uber), the map is the primary visual centerpiece. An unstyled, clunky map with default generic blue pins ruins the entire user experience. This skill covers how to style, animate, and engineer interactive Leaflet maps with zero paid APIs.

---

## 1. Custom SVG Markers & Rotation

Never use default standard Leaflet pin icons. Use custom SVG DivIcons with pulse effects and vehicle heading rotation:

### A. Pulsing Pickup Marker (Emerald Green)
```tsx
export function createPickupMarkerIcon() {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute w-8 h-8 bg-emerald-500 rounded-full opacity-30 animate-ping"></span>
        <div class="relative w-6 h-6 bg-emerald-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <circle cx="12" cy="12" r="4" fill="currentColor"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
```

### B. Rotating Vehicle Marker (Bike / Car)
Icon dynamically rotates according to vehicle heading angle (0° to 360°):
```tsx
export function createVehicleMarkerIcon(vehicleType: 'BIKE' | 'CAR', heading: number = 0) {
  const iconSvg = vehicleType === 'BIKE'
    ? `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>`
    : `<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

  return L.divIcon({
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
}
```

---

## 2. Route Polyline Aesthetics (OSRM Paths)

A standard 1px blue line looks amateur. Layered glowing polylines give a premium native GPS appearance:

```tsx
import { Polyline } from 'react-leaflet';

export function RouteLayer({ coordinates }: { coordinates: [number, number][] }) {
  if (!coordinates || coordinates.length === 0) return null;

  return (
    <>
      {/* Outer Glow / Casing */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: 'rgba(0, 177, 79, 0.25)',
          weight: 10,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Core Sharp Route */}
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
}
```

---

## 3. Dynamic Camera & Smart FitBounds

When a trip progresses, the camera must auto-frame all relevant points (Driver, Pickup, Dropoff) without being obscured by the bottom sheet:

```typescript
export function smartFitBounds(
  map: L.Map,
  points: [number, number][],
  bottomSheetHeightPx: number = 280
) {
  if (points.length === 0) return;

  const bounds = L.latLngBounds(points);
  
  map.fitBounds(bounds, {
    paddingTopLeft: [50, 50],
    paddingBottomRight: [50, bottomSheetHeightPx + 30], // Extra padding for bottom sheet!
    maxZoom: 16,
    animate: true,
    duration: 1.0,
  });
}
```

---

## 4. Map Tile Styling (Clean OpenStreetMap)

For modern aesthetics, reduce OSM visual noise using CSS tile filters:

```css
/* Subtle modern map tone (less vibrant, more focused on routes) */
.leaflet-tile-pane {
  filter: saturate(0.85) contrast(1.05) brightness(1.02);
}

/* Optional Dark Mode Tile Filter */
.dark .leaflet-tile-pane {
  filter: invert(1) hue-rotate(180deg) saturate(0.8) contrast(1.2);
}
```

---

## 5. Preventing Map Leaks & Gesture Conflicts

1. **Map Invalidation on Tab/Resize**:
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       mapRef.current?.invalidateSize();
     }, 100);
     return () => clearTimeout(timer);
   }, []);
   ```

2. **Prevent Drag / Click Through on Floating Cards**:
   Always add `onMouseDown={(e) => e.stopPropagation()}` and `onTouchStart={(e) => e.stopPropagation()}` on floating modals or cards over Leaflet maps to prevent dragging the underlying map when interacting with the UI.

3. **Lifecycle Cleanup**: Always unmount markers and clear Leaflet layers inside `useEffect` cleanup functions.
