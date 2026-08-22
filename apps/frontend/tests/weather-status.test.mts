import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeatherStatus } from '../src/utils/weatherStatus.utils.ts';

test('normalizes the backend extreme-weather flag without inventing a default', () => {
  assert.equal(normalizeWeatherStatus({ isExtremeWeather: true }), true);
  assert.equal(normalizeWeatherStatus({ isExtremeWeather: false }), false);
});

test('rejects a malformed weather response', () => {
  assert.throws(() => normalizeWeatherStatus(null), /thời tiết/i);
  assert.throws(() => normalizeWeatherStatus({ isExtremeWeather: 'yes' }), /thời tiết/i);
});

