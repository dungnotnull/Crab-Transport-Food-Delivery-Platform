import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGeocodingCacheKey,
  isResolvedAddressValue,
  normalizePhotonFeature,
} from '../src/utils/geocoding.utils.ts';
import { createGeocodingService } from '../src/services/geocoding.service.ts';

const benThanhFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [106.700806, 10.776889] },
  properties: {
    osm_type: 'W',
    osm_id: 123,
    name: 'Chợ Bến Thành',
    street: 'Lê Lợi',
    district: 'Quận 1',
    city: 'Thành phố Hồ Chí Minh',
    country: 'Việt Nam',
  },
};

test('normalizes a Photon feature into exact Leaflet coordinates', () => {
  const result = normalizePhotonFeature(benThanhFeature);

  assert.equal(result?.primaryText, 'Chợ Bến Thành');
  assert.equal(
    result?.secondaryText,
    'Lê Lợi, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
  );
  assert.deepEqual(result?.point, {
    lat: 10.776889,
    lng: 106.700806,
    address: 'Chợ Bến Thành, Lê Lợi, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
  });
});

test('rejects malformed Photon coordinates instead of inventing a location', () => {
  assert.equal(
    normalizePhotonFeature({
      geometry: { type: 'Point', coordinates: ['bad', null] },
      properties: { name: 'Không hợp lệ' },
    }),
    null,
  );
});

test('invalidates selected coordinates after their address label is edited', () => {
  const point = { lat: 10.77, lng: 106.7, address: 'Chợ Bến Thành' };

  assert.equal(isResolvedAddressValue('Chợ Bến Thành', point), true);
  assert.equal(isResolvedAddressValue('Chợ Bến Thành mới', point), false);
});

test('keeps a coordinate label as a resolved map selection', () => {
  const point = {
    lat: 10.77,
    lng: 106.7,
    address: '10.77000, 106.70000',
  };

  assert.equal(isResolvedAddressValue('10.77000, 106.70000', point), true);
});

test('creates a stable cache key for equivalent user queries', () => {
  assert.equal(createGeocodingCacheKey('  Chợ   Bến Thành '), 'chợ bến thành');
});

test('searches Photon with Vietnam bounds and reuses an equivalent cached query', async () => {
  const requestedUrls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify({ features: [benThanhFeature] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const service = createGeocodingService(fetcher, 'https://geocoder.example');

  const first = await service.search('Chợ Bến Thành', { lat: 10.77, lng: 106.7 });
  const second = await service.search('  chợ   bến thành ', { lat: 10.77, lng: 106.7 });

  assert.equal(first[0]?.point.lat, 10.776889);
  assert.deepEqual(second, first);
  assert.equal(requestedUrls.length, 1);
  const url = new URL(requestedUrls[0]);
  assert.equal(url.pathname, '/api');
  assert.equal(url.searchParams.get('bbox'), '102.14,8.18,109.47,23.39');
  assert.equal(url.searchParams.get('lat'), '10.77');
  assert.equal(url.searchParams.get('lon'), '106.7');
});

test('returns a normalized point from Photon reverse geocoding', async () => {
  const fetcher = async () => new Response(
    JSON.stringify({ features: [benThanhFeature] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
  const service = createGeocodingService(fetcher, 'https://geocoder.example');

  const result = await service.reverse({ lat: 10.776889, lng: 106.700806 });

  assert.equal(result?.address, 'Chợ Bến Thành, Lê Lợi, Quận 1, Thành phố Hồ Chí Minh, Việt Nam');
});
