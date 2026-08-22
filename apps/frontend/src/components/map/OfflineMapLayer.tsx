import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { scheduleOfflineTileReady } from '../../utils/offlineMap.utils';

function drawOfflineTile(
  canvas: HTMLCanvasElement,
  coordinates: L.Coords,
  tileSize: number,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = tileSize;
  canvas.height = tileSize;

  context.fillStyle = '#eef7f1';
  context.fillRect(0, 0, tileSize, tileSize);

  context.strokeStyle = '#d5e8dc';
  context.lineWidth = 1;
  for (let i = 0; i <= tileSize; i += 64) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, tileSize);
    context.stroke();
    
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(tileSize, i);
    context.stroke();
  }

  // Đường xám dày (trục phụ liên tile)
  context.strokeStyle = '#c0d9c9';
  context.lineWidth = 3;
  if (coordinates.y % 2 === 0 && coordinates.y % 4 !== 0) {
    context.beginPath();
    context.moveTo(0, tileSize / 2);
    context.lineTo(tileSize, tileSize / 2);
    context.stroke();
  }
  if (coordinates.x % 2 === 0 && coordinates.x % 4 !== 0) {
    context.beginPath();
    context.moveTo(tileSize / 2, 0);
    context.lineTo(tileSize / 2, tileSize);
    context.stroke();
  }

  // Đường vàng dày (trục chính liên tile)
  context.strokeStyle = '#f4bd50';
  context.lineWidth = 5;
  if (coordinates.y % 4 === 0) {
    context.beginPath();
    context.moveTo(0, tileSize / 2);
    context.lineTo(tileSize, tileSize / 2);
    context.stroke();
  }
  if (coordinates.x % 4 === 0) {
    context.beginPath();
    context.moveTo(tileSize / 2, 0);
    context.lineTo(tileSize / 2, tileSize);
    context.stroke();
  }

  context.fillStyle = '#5a7d68';
  context.font = '600 11px system-ui, sans-serif';
  context.fillText('BẢN ĐỒ OFFLINE', 14, 22);
  context.fillStyle = '#7b9c87';
  context.font = '10px system-ui, sans-serif';
  context.fillText(`z${coordinates.z} · ${coordinates.x}, ${coordinates.y}`, 14, tileSize - 14);
}

class OfflineGridLayer extends L.GridLayer {
  protected createTile(coordinates: L.Coords, done: L.DoneCallback): HTMLElement {
    const canvas = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;
    drawOfflineTile(canvas, coordinates, 256);
    scheduleOfflineTileReady(done, canvas);
    return canvas;
  }
}

/** Lightweight local Leaflet layer used only when online raster tiles cannot load. */
export const OfflineMapLayer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const layer = new OfflineGridLayer({
      tileSize: 256,
      opacity: 1,
      className: 'offline-map-layer',
    });

    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);

  return null;
};
