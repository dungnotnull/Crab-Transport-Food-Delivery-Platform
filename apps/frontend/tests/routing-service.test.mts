import test from 'node:test';
import assert from 'node:assert/strict';

const routingModule = await import('../src/services/routing.service.ts').catch(
  () => ({} as Record<string, unknown>),
);

test('loads and normalizes a public OSRM route for the driver simulator', async () => {
  assert.equal(
    typeof routingModule.routingService,
    'object',
    'Thiếu routing service độc lập cho portal tài xế',
  );

  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [106.7, 10.78],
                [106.72, 10.8],
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const service = routingModule.routingService as {
      getRouteGeometry: (
        start: { lat: number; lng: number },
        end: { lat: number; lng: number },
      ) => Promise<Array<[number, number]>>;
    };
    const geometry = await service.getRouteGeometry(
      { lat: 10.78, lng: 106.7 },
      { lat: 10.8, lng: 106.72 },
    );

    assert.deepEqual(geometry, [
      [10.78, 106.7],
      [10.8, 106.72],
    ]);
    assert.match(requestedUrl, /router\.project-osrm\.org\/route\/v1\/driving/);
    assert.match(requestedUrl, /geometries=geojson/);
    assert.match(requestedUrl, /overview=full/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects an OSRM response without a usable linestring', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ code: 'Ok', routes: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  try {
    const service = routingModule.routingService as {
      getRouteGeometry: (
        start: { lat: number; lng: number },
        end: { lat: number; lng: number },
      ) => Promise<Array<[number, number]>>;
    };

    await assert.rejects(
      service.getRouteGeometry(
        { lat: 10.78, lng: 106.7 },
        { lat: 10.8, lng: 106.72 },
      ),
      /OSRM/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
