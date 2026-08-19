import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { DriversService } from '../drivers/drivers.service';
import { Cron } from '@nestjs/schedule';

@WebSocketGateway({ cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  
  // Buffer for driver telemetry: driverId -> { lat, lng }
  private locationBuffer = new Map<string, { lat: number; lng: number }>();

  constructor(
    private jwtService: JwtService,
    private driversService: DriversService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers['authorization']?.split(' ')[1];
      if (!token) throw new UnauthorizedException('Missing token');

      const payload = this.jwtService.verify(token);
      client.data.user = payload; // Attach user data to socket
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('driver:update_location')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tripId: string; lat: number; lng: number },
  ) {
    const user = client.data.user;
    if (!user || user.role !== 'DRIVER') return;

    // 1. Instantly broadcast to customer viewing the trip
    if (payload.tripId) {
      this.server.to(`trip_${payload.tripId}`).emit('trip:location_stream', {
        driverId: user.sub,
        lat: payload.lat,
        lng: payload.lng,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Buffer location for DB flush
    this.locationBuffer.set(user.sub, { lat: payload.lat, lng: payload.lng });
  }

  // Exposed for Simulator or backend events to emit offers
  emitOrderOffer(driverId: string, orderData: any) {
    // Assuming driver's user.sub room or specific socket mapping. 
    // For simplicity, we can broadcast to a driver specific room:
    this.server.to(`driver_${driverId}`).emit('driver:trip_offer', orderData);
  }

  @Cron('*/10 * * * * *')
  async flushLocationBuffer() {
    if (this.locationBuffer.size === 0) return;

    this.logger.debug(`Flushing ${this.locationBuffer.size} locations to DB`);
    
    // Create a copy and clear the original buffer to receive new points
    const entries = Array.from(this.locationBuffer.entries());
    this.locationBuffer.clear();

    for (const [driverId, loc] of entries) {
      try {
        await this.driversService.updateLocation(driverId, loc.lat, loc.lng);
      } catch (err) {
        this.logger.error(`Failed to update location for driver ${driverId}`, err);
      }
    }
  }
}
