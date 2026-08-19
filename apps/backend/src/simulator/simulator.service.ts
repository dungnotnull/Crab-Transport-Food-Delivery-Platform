import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoutingService } from '../routing/routing.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { DriversService } from '../drivers/drivers.service';
import * as turf from '@turf/turf';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private routingService: RoutingService,
    private trackingGateway: TrackingGateway,
    private ordersService: OrdersService,
    private driversService: DriversService,
  ) {}

  async simulateTrip(orderId: string, simulateFoodWait: boolean = true) {
    const order = await this.ordersService['ordersRepository'].findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.driver_id) throw new BadRequestException('Order does not have a driver assigned');

    const driverLoc = await this.driversService['locationsRepository'].findOne({ where: { user_id: order.driver_id } });
    if (!driverLoc) throw new NotFoundException('Driver location not found');

    const driverStart = driverLoc.current_location.coordinates; // [lng, lat]
    const startPoint = { lat: driverStart[1], lng: driverStart[0] };
    const pickupPoint = { lat: order.pickup_location.coordinates[1], lng: order.pickup_location.coordinates[0] };
    const dropoffPoint = { lat: order.dropoff_location.coordinates[1], lng: order.dropoff_location.coordinates[0] };

    this.logger.log(`[Simulator] Starting simulation for Order ${orderId}`);

    // LEG 1: Driver -> Pickup
    this.logger.log(`[Simulator] Leg 1: Driving to pickup...`);
    await this.drive(order.driver_id, orderId, startPoint, pickupPoint);
    
    // ARRIVED AT RESTAURANT
    await this.ordersService.updateStatus(orderId, order.driver_id, OrderStatus.ARRIVED_AT_RESTAURANT);

    if (simulateFoodWait) {
      this.logger.log(`[Simulator] Waiting 10 seconds for food...`);
      await this.ordersService.updateStatus(orderId, order.driver_id, OrderStatus.WAITING_FOR_FOOD);
      await this.delay(10000); // Wait 10s
    }

    // LEG 2: Pickup -> Dropoff
    this.logger.log(`[Simulator] Leg 2: Driving to dropoff...`);
    await this.ordersService.updateStatus(orderId, order.driver_id, OrderStatus.IN_TRANSIT);
    await this.drive(order.driver_id, orderId, pickupPoint, dropoffPoint);

    // ARRIVED AT DESTINATION & COMPLETED
    await this.ordersService.updateStatus(orderId, order.driver_id, OrderStatus.ARRIVED_AT_DESTINATION);
    await this.delay(2000); // 2s pause before completing
    await this.ordersService.updateStatus(orderId, order.driver_id, OrderStatus.COMPLETED);
    this.logger.log(`[Simulator] Simulation finished for Order ${orderId}`);
  }

  private async drive(driverId: string, orderId: string, start: {lat: number, lng: number}, end: {lat: number, lng: number}): Promise<void> {
    const route = await this.routingService.getRoute(start, end);
    const line = turf.lineString(route.geometry.coordinates);
    const totalLength = turf.length(line, { units: 'meters' });

    const metersPerTick = 12.5; // ~45km/h over 1s ticks
    let currentDistance = 0;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        currentDistance += metersPerTick;

        if (currentDistance >= totalLength) {
          clearInterval(interval);
          const endPoint = turf.along(line, totalLength, { units: 'meters' });
          this.emitLocation(driverId, orderId, endPoint.geometry.coordinates);
          resolve();
        } else {
          const currentPoint = turf.along(line, currentDistance, { units: 'meters' });
          this.emitLocation(driverId, orderId, currentPoint.geometry.coordinates);
        }
      }, 1000);
    });
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitLocation(driverId: string, orderId: string, coordinates: number[]) {
    const [lng, lat] = coordinates;
    // We can simulate the driver updating their location via the gateway
    // In a real scenario, the driver app emits this to the Gateway.
    // Since we are mocking, we can just call a method on the gateway directly
    // or emit it to the room.
    
    this.trackingGateway.server.to(`order_${orderId}`).emit('order:location_stream', {
      driverId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    // Note: We are not buffering this into DB because we bypass `handleLocationUpdate`.
    // If we want DB buffering, we should call a method on trackingGateway to buffer it.
  }
}
