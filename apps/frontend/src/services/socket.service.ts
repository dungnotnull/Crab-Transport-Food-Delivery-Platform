import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('crab_access_token');
    
    // Gateway backend port is 4000
    this.socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    // Register all active listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb as any);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', room);
    } else {
      // If not connected yet, wait for connect
      this.socket?.once('connect', () => {
        this.socket?.emit('join_room', room);
      });
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    this.socket?.on(event, callback as any);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
    this.socket?.off(event, callback as any);
  }
}

export const socketService = new SocketService();
