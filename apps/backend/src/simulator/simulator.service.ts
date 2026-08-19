import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoutingService } from '../routing/routing.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrdersService } from '../trips/trips.service';
import { OrderStatus } from '../trips/entities/trip.entity';
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

  async simulateTrip(tripId: string) {
    const trip = await this.ordersService['ordersRepository'].findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!trip.driver_id) throw new BadRequestException('Trip does not have a driver assigned');

    const driverLoc = await this.driversService['locationsRepository'].findOne({ where: { user_id: trip.driver_id } });
    if (!driverLoc) throw new NotFoundException('Driver location not found');

    const driverStart = driverLoc.current_location.coordinates; // [lng, lat]
    const startPoint = { lat: driverStart[1], lng: driverStart[0] };
    const pickupPoint = { lat: trip.pickup_location.coordinates[1], lng: trip.pickup_location.coordinates[0] };
    const dropoffPoint = { lat: trip.dropoff_location.coordinates[1], lng: trip.dropoff_location.coordinates[0] };

    this.logger.log(`[Simulator] Starting simulation for Trip ${tripId}`);

    // LEG 1: Driver -> Pickup
    this.logger.log(`[Simulator] Leg 1: Driving to pickup...`);
    await this.drive(trip.driver_id, tripId, startPoint, pickupPoint);
    
    // ARRIVED AT PICKUP
    await this.ordersService.updateStatus(tripId, trip.driver_id, OrderStatus.ARRIVED_AT_PICKUP);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // IN TRANSIT
    this.logger.log(`[Simulator] Trip ${tripId} is now IN_TRANSIT`);
    await this.ordersService.updateStatus(tripId, trip.driver_id, OrderStatus.IN_TRANSIT);
    await this.drive(trip.driver_id, tripId, pickupPoint, dropoffPoint);

    // ARRIVED AT DESTINATION & COMPLETED
    await this.ordersService.updateStatus(tripId, trip.driver_id, OrderStatus.ARRIVED_AT_DESTINATION);
    await this.delay(2000); // 2s pause before completing
    await this.ordersService.updateStatus(tripId, trip.driver_id, OrderStatus.COMPLETED);
    this.logger.log(`[Simulator] Simulation finished for Trip ${tripId}`);
  }

  private async drive(driverId: string, tripId: string, start: {lat: number, lng: number}, end: {lat: number, lng: number}): Promise<void> {
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
          this.emitLocation(driverId, tripId, endPoint.geometry.coordinates);
          resolve();
        } else {
          const currentPoint = turf.along(line, currentDistance, { units: 'meters' });
          this.emitLocation(driverId, tripId, currentPoint.geometry.coordinates);
        }
      }, 1000);
    });
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitLocation(driverId: string, tripId: string, coordinates: number[]) {
    const [lng, lat] = coordinates;
    // We can simulate the driver updating their location via the gateway
    // In a real scenario, the driver app emits this to the Gateway.
    // Since we are mocking, we can just call a method on the gateway directly
    // or emit it to the room.
    
    this.trackingGateway.server.to(`trip_${tripId}`).emit('trip:location_stream', {
      driverId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    // Note: We are not buffering this into DB because we bypass `handleLocationUpdate`.
    // If we want DB buffering, we should call a method on trackingGateway to buffer it.
  }
}
