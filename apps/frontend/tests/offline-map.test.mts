import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleOfflineTileReady,
  shouldEnableOfflineMap,
} from '../src/utils/offlineMap.utils.ts';

test('enables the offline map after two tile failures without a successful tile', () => {
  assert.equal(shouldEnableOfflineMap(0, false), false);
  assert.equal(shouldEnableOfflineMap(1, false), false);
  assert.equal(shouldEnableOfflineMap(2, false), true);
});

test('keeps the online map when at least one tile loaded successfully', () => {
  assert.equal(shouldEnableOfflineMap(4, true), false);
});

test('marks a generated offline tile ready after Leaflet has appended it', async () => {
  const events: string[] = [];
  const tile = {} as HTMLElement;

  scheduleOfflineTileReady(() => events.push('ready'), tile);
  events.push('returned');
  await Promise.resolve();

  assert.deepEqual(events, ['returned', 'ready']);
});
