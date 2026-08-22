const OFFLINE_TILE_ERROR_THRESHOLD = 2;

/** Only replace the base map when the configured provider is unavailable. */
export function shouldEnableOfflineMap(
  tileErrorCount: number,
  hasLoadedTile: boolean,
): boolean {
  return !hasLoadedTile && tileErrorCount >= OFFLINE_TILE_ERROR_THRESHOLD;
}

/** Leaflet adds tile visibility classes only after a generated tile is attached to its container. */
export function scheduleOfflineTileReady(
  done: (error?: Error, tile?: HTMLElement) => void,
  tile: HTMLElement,
): void {
  queueMicrotask(() => done(undefined, tile));
}
