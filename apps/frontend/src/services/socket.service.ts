import { io } from 'socket.io-client';

type SocketListener = (...args: any[]) => void;

export interface SocketClient {
  connected: boolean;
  on: (event: string, callback: SocketListener) => unknown;
  off: (event: string, callback: SocketListener) => unknown;
  emit: (event: string, data?: unknown) => unknown;
  disconnect: () => unknown;
}

interface SocketOptions {
  auth: { token: string | null };
  transports: string[];
}

export type SocketFactory = (url: string, options: SocketOptions) => SocketClient;
export type AccessTokenProvider = () => string | null;

const getStoredAccessToken: AccessTokenProvider = () =>
  sessionStorage.getItem('crab_access_token') || localStorage.getItem('crab_access_token');

export class SocketService {
  private socket: SocketClient | null = null;
  private listeners: Map<string, SocketListener[]> = new Map();
  private joinedRooms = new Set<string>();
  private readonly socketFactory: SocketFactory;
  private readonly accessTokenProvider: AccessTokenProvider;

  constructor(
    socketFactory: SocketFactory = io as SocketFactory,
    accessTokenProvider: AccessTokenProvider = getStoredAccessToken,
  ) {
    this.socketFactory = socketFactory;
    this.accessTokenProvider = accessTokenProvider;
  }

  connect() {
    if (this.socket) return;

    const token = this.accessTokenProvider();
    
    // Gateway backend port is 4000
    const socket = this.socketFactory('http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket = socket;

    // Socket.IO tạo socket id mới sau reconnect nên server room phải được join lại.
    socket.on('connect', () => {
      this.joinedRooms.forEach((room) => socket.emit('join_room', room));
    });

    // Register all active listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        socket.on(event, cb);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
  }

  joinRoom(room: string) {
    const isNewRoom = !this.joinedRooms.has(room);
    this.joinedRooms.add(room);

    if (isNewRoom && this.socket?.connected) {
      this.socket.emit('join_room', room);
    }
  }

  /** Quên room đã kết thúc để lần reconnect sau không đăng ký lại chuyến cũ. */
  forgetRoom(room: string) {
    this.joinedRooms.delete(room);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: SocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: SocketListener) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
