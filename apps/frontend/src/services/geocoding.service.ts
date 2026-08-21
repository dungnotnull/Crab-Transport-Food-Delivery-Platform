import type { AddressSuggestion, LocationPoint } from '../types/trip.types';
import {
  createGeocodingCacheKey,
  normalizePhotonFeature,
} from '../utils/geocoding.utils.ts';

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface PhotonResponse {
  features?: unknown[];
}

const DEFAULT_BASE_URL = 'https://photon.komoot.io';
const VIETNAM_BBOX = '102.14,8.18,109.47,23.39';

function isValidPoint(point?: LocationPoint | null): point is LocationPoint {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180,
  );
}

function getConfiguredBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return viteEnv?.VITE_GEOCODING_URL || DEFAULT_BASE_URL;
}

function normalizeFeatures(payload: PhotonResponse): AddressSuggestion[] {
  const suggestions: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const feature of payload.features ?? []) {
    const suggestion = normalizePhotonFeature(feature);
    if (!suggestion || seen.has(suggestion.id)) continue;
    seen.add(suggestion.id);
    suggestions.push(suggestion);
  }

  return suggestions;
}

export function createGeocodingService(
  fetcher: Fetcher = fetch,
  configuredBaseUrl = getConfiguredBaseUrl(),
) {
  const baseUrl = configuredBaseUrl.replace(/\/$/, '');
  const cache = new Map<string, AddressSuggestion[]>();

  return {
    async search(
      query: string,
      bias?: LocationPoint | null,
      signal?: AbortSignal,
    ): Promise<AddressSuggestion[]> {
      const normalizedQuery = createGeocodingCacheKey(query);
      if (normalizedQuery.length < 3) return [];

      const biasKey = isValidPoint(bias)
        ? `${bias.lat.toFixed(3)},${bias.lng.toFixed(3)}`
        : 'none';
      const cacheKey = `${normalizedQuery}:${biasKey}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const url = new URL(`${baseUrl}/api`);
      url.searchParams.set('q', query.trim().replace(/\s+/g, ' '));
      url.searchParams.set('limit', '6');
      url.searchParams.set('lang', 'vi');
      url.searchParams.set('bbox', VIETNAM_BBOX);
      if (isValidPoint(bias)) {
        url.searchParams.set('lat', String(bias.lat));
        url.searchParams.set('lon', String(bias.lng));
      }

      const response = await fetcher(url, { signal, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Geocoder request failed with status ${response.status}`);
      }

      const suggestions = normalizeFeatures(await response.json() as PhotonResponse);
      cache.set(cacheKey, suggestions);
      return suggestions;
    },

    async reverse(
      point: LocationPoint,
      signal?: AbortSignal,
    ): Promise<LocationPoint | null> {
      if (!isValidPoint(point)) return null;

      const url = new URL(`${baseUrl}/reverse`);
      url.searchParams.set('lat', String(point.lat));
      url.searchParams.set('lon', String(point.lng));
      url.searchParams.set('lang', 'vi');

      const response = await fetcher(url, { signal, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Reverse geocoder request failed with status ${response.status}`);
      }

      return normalizeFeatures(await response.json() as PhotonResponse)[0]?.point ?? null;
    },
  };
}

export const geocodingService = createGeocodingService();
