import test from 'node:test';
import assert from 'node:assert/strict';

const simulationModule = await import(
  '../src/utils/driverTripSimulation.utils.ts'
).catch(() => ({} as Record<string, unknown>));

const pickup = {
  lat: 10.78,
  lng: 106.7,
  address: 'Điểm đón',
};
const dropoff = {
  lat: 10.8,
  lng: 106.72,
  address: 'Điểm đến',
};

test('always includes the active trip id in a simulated driver location event', () => {
  assert.equal(
    typeof simulationModule.createDriverLocationUpdatePayload,
    'function',
    'Thiếu bộ tạo payload vị trí tài xế theo contract socket',
  );

  const createPayload = simulationModule.createDriverLocationUpdatePayload as (
    tripId: string,
    point: { lat: number; lng: number; heading?: number },
  ) => unknown;

  assert.deepEqual(
    createPayload('trip-123', { lat: 10.77, lng: 106.69, heading: 390 }),
    { tripId: 'trip-123', lat: 10.77, lng: 106.69, heading: 30 },
  );
});

test('plans the complete accepted-trip journey in backend state-machine order', () => {
  assert.equal(
    typeof simulationModule.createDriverTripSimulationPlan,
    'function',
    'Thiếu bộ lập kế hoạch mô phỏng chuyến đi',
  );

  const createPlan = simulationModule.createDriverTripSimulationPlan as (input: {
    tripId: string;
    status: string;
    currentLocation: { lat: number; lng: number };
    pickup: typeof pickup;
    dropoff: typeof dropoff;
    stepsPerLeg: number;
  }) => Array<Record<string, any>>;

  const plan = createPlan({
    tripId: 'trip-accepted',
    status: 'ACCEPTED',
    currentLocation: { lat: 10.76, lng: 106.68 },
    pickup,
    dropoff,
    stepsPerLeg: 2,
  });

  assert.deepEqual(
    plan.filter((action) => action.type === 'STATUS').map((action) => action.status),
    [
      'ARRIVED_AT_PICKUP',
      'IN_TRANSIT',
      'ARRIVED_AT_DESTINATION',
      'COMPLETED',
    ],
  );

  const locations = plan.filter((action) => action.type === 'LOCATION');
  assert.equal(locations.length, 4);
  assert.equal(locations.every((action) => action.payload.tripId === 'trip-accepted'), true);
  assert.deepEqual(
    { lat: locations[1].payload.lat, lng: locations[1].payload.lng },
    { lat: pickup.lat, lng: pickup.lng },
  );
  assert.deepEqual(
    { lat: locations[3].payload.lat, lng: locations[3].payload.lng },
    { lat: dropoff.lat, lng: dropoff.lng },
  );
});

test('resumes an in-transit simulation without moving back to pickup', () => {
  assert.equal(
    typeof simulationModule.createDriverTripSimulationPlan,
    'function',
    'Thiếu bộ lập kế hoạch mô phỏng chuyến đi',
  );

  const createPlan = simulationModule.createDriverTripSimulationPlan as (input: {
    tripId: string;
    status: string;
    currentLocation: { lat: number; lng: number };
    pickup: typeof pickup;
    dropoff: typeof dropoff;
    stepsPerLeg: number;
  }) => Array<Record<string, any>>;

  const currentLocation = { lat: 10.79, lng: 106.71 };
  const plan = createPlan({
    tripId: 'trip-in-transit',
    status: 'IN_TRANSIT',
    currentLocation,
    pickup,
    dropoff,
    stepsPerLeg: 2,
  });

  assert.deepEqual(
    plan.filter((action) => action.type === 'STATUS').map((action) => action.status),
    ['ARRIVED_AT_DESTINATION', 'COMPLETED'],
  );
  assert.equal(
    plan.some((action) => action.type === 'LOCATION' && action.phase === 'TO_PICKUP'),
    false,
  );
  assert.deepEqual(
    plan.filter((action) => action.type === 'LOCATION')[1].payload,
    {
      tripId: 'trip-in-transit',
      lat: dropoff.lat,
      lng: dropoff.lng,
      heading: plan.filter((action) => action.type === 'LOCATION')[1].payload.heading,
    },
  );
});

test('follows the supplied OSRM geometry instead of cutting across the route', () => {
  const createPlan = simulationModule.createDriverTripSimulationPlan as (input: {
    tripId: string;
    status: string;
    currentLocation: { lat: number; lng: number };
    pickup: typeof pickup;
    dropoff: typeof dropoff;
    dropoffRoute: Array<[number, number]>;
    stepsPerLeg: number;
  }) => Array<Record<string, any>>;

  const plan = createPlan({
    tripId: 'trip-osrm-route',
    status: 'IN_TRANSIT',
    currentLocation: pickup,
    pickup,
    dropoff,
    dropoffRoute: [
      [pickup.lat, pickup.lng],
      [dropoff.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ],
    stepsPerLeg: 2,
  });

  const firstLocation = plan.find((action) => action.type === 'LOCATION');
  assert.ok(firstLocation);
  assert.ok(firstLocation.payload.lat > 10.795);
  assert.ok(firstLocation.payload.lng < 106.705);
});

test('runs location and status actions sequentially at the selected speed', async () => {
  assert.equal(
    typeof simulationModule.runDriverTripSimulationPlan,
    'function',
    'Thiếu runner thực thi kế hoạch mô phỏng',
  );

  const createPlan = simulationModule.createDriverTripSimulationPlan as (input: {
    tripId: string;
    status: string;
    currentLocation: { lat: number; lng: number };
    pickup: typeof pickup;
    dropoff: typeof dropoff;
    stepsPerLeg: number;
  }) => Array<Record<string, any>>;
  const runPlan = simulationModule.runDriverTripSimulationPlan as (
    actions: Array<Record<string, any>>,
    options: Record<string, any>,
  ) => Promise<string>;
  const observedStatuses: string[] = [];
  const observedLocations: string[] = [];
  const observedWaits: number[] = [];
  const actions = createPlan({
    tripId: 'trip-runner',
    status: 'ACCEPTED',
    currentLocation: { lat: 10.76, lng: 106.68 },
    pickup,
    dropoff,
    stepsPerLeg: 1,
  });

  const result = await runPlan(actions, {
    speed: 2,
    onLocation: (payload: { tripId: string }) => observedLocations.push(payload.tripId),
    onStatus: async (status: string) => observedStatuses.push(status),
    wait: async (durationMs: number) => {
      observedWaits.push(durationMs);
    },
  });

  assert.equal(result, 'COMPLETED');
  assert.deepEqual(observedLocations, ['trip-runner', 'trip-runner']);
  assert.deepEqual(observedStatuses, [
    'ARRIVED_AT_PICKUP',
    'IN_TRANSIT',
    'ARRIVED_AT_DESTINATION',
    'COMPLETED',
  ]);
  assert.deepEqual(observedWaits, [600, 900, 600, 450]);
});

test('stops before changing trip status after simulation cancellation', async () => {
  assert.equal(
    typeof simulationModule.runDriverTripSimulationPlan,
    'function',
    'Thiếu runner thực thi kế hoạch mô phỏng',
  );

  const createPlan = simulationModule.createDriverTripSimulationPlan as (input: {
    tripId: string;
    status: string;
    currentLocation: { lat: number; lng: number };
    pickup: typeof pickup;
    dropoff: typeof dropoff;
    stepsPerLeg: number;
  }) => Array<Record<string, any>>;
  const runPlan = simulationModule.runDriverTripSimulationPlan as (
    actions: Array<Record<string, any>>,
    options: Record<string, any>,
  ) => Promise<string>;
  const controller = new AbortController();
  const observedStatuses: string[] = [];
  const actions = createPlan({
    tripId: 'trip-cancelled',
    status: 'ACCEPTED',
    currentLocation: { lat: 10.76, lng: 106.68 },
    pickup,
    dropoff,
    stepsPerLeg: 2,
  });

  const result = await runPlan(actions, {
    speed: 1,
    signal: controller.signal,
    onLocation: () => controller.abort(),
    onStatus: async (status: string) => observedStatuses.push(status),
    wait: async () => undefined,
  });

  assert.equal(result, 'CANCELLED');
  assert.deepEqual(observedStatuses, []);
});

test('pauses live GPS sync while the manual trip simulation is running', () => {
  assert.equal(
    typeof simulationModule.shouldSyncLiveDriverLocation,
    'function',
    'Thiếu guard ngăn GPS thật ghi đè vị trí đang mô phỏng',
  );

  const shouldSync = simulationModule.shouldSyncLiveDriverLocation as (
    isOnline: boolean,
    isSimulatingTrip: boolean,
  ) => boolean;

  assert.equal(shouldSync(true, false), true);
  assert.equal(shouldSync(true, true), false);
  assert.equal(shouldSync(false, false), false);
});

test('ignores socket events that do not belong to the active trip', () => {
  assert.equal(
    typeof simulationModule.isEventForActiveTrip,
    'function',
    'Thiếu guard chặn event từ room chuyến đi cũ',
  );

  const isForActiveTrip = simulationModule.isEventForActiveTrip as (
    activeTripId: string | null,
    eventTripId: unknown,
  ) => boolean;

  assert.equal(isForActiveTrip('trip-current', 'trip-current'), true);
  assert.equal(isForActiveTrip('trip-current', 'trip-old'), false);
  assert.equal(isForActiveTrip(null, 'trip-old'), false);
  assert.equal(isForActiveTrip('trip-current', undefined), false);
});
