import type { AddressSuggestion, LocationPoint } from '../types/trip.types';

interface PhotonFeature {
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueAddressParts(parts: string[]): string[] {
  const seen = new Set<string>();

  return parts.filter((part) => {
    const key = createGeocodingCacheKey(part);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createGeocodingCacheKey(query: string): string {
  return query
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');
}

export function isResolvedAddressValue(
  query: string,
  value: LocationPoint | null,
): boolean {
  if (!value?.address) return false;

  return createGeocodingCacheKey(query) === createGeocodingCacheKey(value.address);
}

export function normalizePhotonFeature(feature: unknown): AddressSuggestion | null {
  if (!feature || typeof feature !== 'object') return null;

  const candidate = feature as PhotonFeature;
  const coordinates = candidate.geometry?.coordinates;
  if (candidate.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null;

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const properties = candidate.properties ?? {};
  const name = readText(properties.name);
  const houseNumber = readText(properties.housenumber);
  const street = readText(properties.street);
  const locality = readText(properties.locality);
  const district = readText(properties.district);
  const city = readText(properties.city);
  const state = readText(properties.state);
  const postcode = readText(properties.postcode);
  const country = readText(properties.country);
  const primaryText = name || [houseNumber, street].filter(Boolean).join(' ') || locality || city;

  if (!primaryText) return null;

  const addressParts = uniqueAddressParts([
    primaryText,
    street,
    locality,
    district,
    city,
    state,
    postcode,
    country,
  ]);
  const secondaryParts = addressParts.filter(
    (part) => createGeocodingCacheKey(part) !== createGeocodingCacheKey(primaryText),
  );
  const osmType = readText(properties.osm_type) || undefined;
  const osmId =
    typeof properties.osm_id === 'string' || typeof properties.osm_id === 'number'
      ? properties.osm_id
      : undefined;

  return {
    id: osmType && osmId !== undefined ? `${osmType}-${osmId}` : `${lat}-${lng}`,
    primaryText,
    secondaryText: secondaryParts.join(', '),
    point: {
      lat,
      lng,
      address: addressParts.join(', '),
    },
    osmType,
    osmId,
  };
}
