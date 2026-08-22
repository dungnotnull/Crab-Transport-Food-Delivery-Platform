import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SocketService,
  type SocketClient,
  type SocketFactory,
} from '../src/services/socket.service.ts';

class FakeSocket implements SocketClient {
  connected = false;
  readonly emitted: Array<[string, unknown]> = [];
  private readonly handlers = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, callback: (...args: any[]) => void) {
    const callbacks = this.handlers.get(event) ?? new Set();
    callbacks.add(callback);
    this.handlers.set(event, callbacks);
    return this;
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.handlers.get(event)?.delete(callback);
    return this;
  }

  emit(event: string, data?: unknown) {
    this.emitted.push([event, data]);
    return this;
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  trigger(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((callback) => callback(...args));
  }
}

test('remembers a room joined before the socket connects', () => {
  const socket = new FakeSocket();
  const factory: SocketFactory = () => socket;
  const service = new SocketService(factory, () => null);

  service.connect();
  service.joinRoom('trip_trip-1');
  assert.deepEqual(socket.emitted, []);

  socket.connected = true;
  socket.trigger('connect');

  assert.deepEqual(socket.emitted, [['join_room', 'trip_trip-1']]);
});

test('rejoins every distinct room once after each reconnect', () => {
  const socket = new FakeSocket();
  const service = new SocketService(() => socket, () => null);

  service.connect();
  service.joinRoom('trip_trip-1');
  service.joinRoom('trip_trip-1');
  service.joinRoom('trip_trip-2');

  socket.connected = true;
  socket.trigger('connect');
  assert.deepEqual(socket.emitted, [
    ['join_room', 'trip_trip-1'],
    ['join_room', 'trip_trip-2'],
  ]);

  socket.emitted.length = 0;
  socket.trigger('connect');
  assert.deepEqual(socket.emitted, [
    ['join_room', 'trip_trip-1'],
    ['join_room', 'trip_trip-2'],
  ]);
});

test('does not rejoin a completed trip room after it is forgotten', () => {
  const socket = new FakeSocket();
  const service = new SocketService(() => socket, () => null);

  service.connect();
  service.joinRoom('trip_completed');
  service.joinRoom('trip_active');
  service.forgetRoom('trip_completed');

  socket.connected = true;
  socket.trigger('connect');

  assert.deepEqual(socket.emitted, [['join_room', 'trip_active']]);
});
