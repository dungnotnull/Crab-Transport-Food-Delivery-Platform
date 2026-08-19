import { Injectable, BadRequestException, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Order, OrderStatus } from './entities/order.entity';
import { Review } from './entities/review.entity';
import { BookOrderDto } from './dto/book-order.dto';
import { RoutingService } from '../routing/routing.service';
import { PricingService } from '../pricing/pricing.service';
import { DriversService } from '../drivers/drivers.service';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { Role } from '../users/entities/user.entity';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private routingService: RoutingService,
    private pricingService: PricingService,
    private eventEmitter: EventEmitter2,
    private driversService: DriversService,
    private trackingGateway: TrackingGateway,
  ) {}

  async previewOrder(bookOrderDto: BookOrderDto) {
    // Call OSRM
    const route = await this.routingService.getRoute(bookOrderDto.pickup, bookOrderDto.dropoff);
    
    if (route.distance > 50000) {
      throw new BadRequestException('Distance exceeds 50km limit');
    }

    const fare = this.pricingService.calculateFare(route.distance, 'STANDARD');

    return {
      distance: route.distance,
      duration: route.duration,
      fare,
      geometry: route.geometry, // For Leaflet to draw polyline
    };
  }

  async bookOrder(customerId: string, bookOrderDto: BookOrderDto): Promise<Order> {
    const { pickup, dropoff } = bookOrderDto;

    // 1. Calculate route & distance
    const route = await this.routingService.getRoute(pickup, dropoff);

    // 2. Validate Geospatial Constraint: max 50km
    if (route.distance > 50000) {
      throw new BadRequestException('Distance exceeds the maximum allowed limit of 50km');
    }

    // 3. Calculate Pricing
    const totalFare = this.pricingService.calculateFare(route.distance);

    // 4. Create Order
    const order = this.ordersRepository.create({
      customer_id: customerId,
      pickup_location: {
        type: 'Point',
        coordinates: [pickup.lng, pickup.lat],
      },
      dropoff_location: {
        type: 'Point',
        coordinates: [dropoff.lng, dropoff.lat],
      },
      total_fare: totalFare,
      status: OrderStatus.FINDING_DRIVER,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // 5. Emit event for Dispatch/Matching algorithm
    this.eventEmitter.emit('order.created', savedOrder);
    this.logger.log(`Order ${savedOrder.id} booked successfully by customer ${customerId}`);

    return savedOrder;
  }

  @Cron('0 * * * * *') // Run every minute
  async handleTimeoutOrders() {
    this.logger.debug('Running cronjob: handleTimeoutOrders');
    
    // Find orders in FINDING_DRIVER status older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const staleOrders = await this.ordersRepository.find({
      where: {
        status: OrderStatus.FINDING_DRIVER,
        created_at: LessThan(fiveMinutesAgo),
      },
    });

    if (staleOrders.length > 0) {
      for (const order of staleOrders) {
        order.status = OrderStatus.CANCELLED;
        await this.ordersRepository.save(order);
        this.logger.log(`Order ${order.id} automatically cancelled due to timeout`);
        // We could emit another event here, e.g., order.cancelled_timeout
      }
    }
  }

  validateStateTransition(current: OrderStatus, next: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.FINDING_DRIVER]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.ARRIVED_AT_RESTAURANT, OrderStatus.CANCELLED],
      [OrderStatus.ARRIVED_AT_PICKUP]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.ARRIVED_AT_RESTAURANT]: [OrderStatus.WAITING_FOR_FOOD, OrderStatus.CANCELLED],
      [OrderStatus.WAITING_FOR_FOOD]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED_AT_DESTINATION],
      [OrderStatus.ARRIVED_AT_DESTINATION]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [OrderStatus.FINDING_DRIVER], // Driver cancel can revert back to FINDING_DRIVER
    };

    return validTransitions[current]?.includes(next) ?? false;
  }

  @OnEvent('order.created')
  async handleOrderCreated(order: Order) {
    this.logger.log(`Handling dispatch for order ${order.id}`);
    const [lng, lat] = order.pickup_location.coordinates;
    const availableDrivers = await this.driversService.findAvailableDrivers(lng, lat, 3000, 5);

    if (availableDrivers.length === 0) {
      this.logger.warn(`No available drivers found for order ${order.id}`);
      return;
    }

    this.logger.log(`Found ${availableDrivers.length} drivers for order ${order.id}. Dispatching...`);
    
    // Broadcast via Socket.io to the drivers
    availableDrivers.forEach(driver => {
      this.logger.debug(`Offer order ${order.id} to driver ${driver.user_id}`);
      this.trackingGateway.emitOrderOffer(driver.user_id, {
        orderId: order.id,
        pickup: order.pickup_location,
        dropoff: order.dropoff_location,
        fare: order.total_fare,
        expiredAt: new Date(Date.now() + 15 * 1000).toISOString(), // 15s TTL
      });
    });
  }

  async acceptOrder(orderId: string, driverId: string): Promise<Order> {
    return await this.ordersRepository.manager.transaction(async (transactionalEntityManager) => {
      const order = await transactionalEntityManager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.FINDING_DRIVER) {
        throw new ConflictException('Order has already been accepted or cancelled');
      }

      const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: driverId } });
      if (driverLoc && driverLoc.active_order_id) {
        throw new ConflictException('Driver is already on an active order');
      }

      order.status = OrderStatus.ACCEPTED;
      order.driver_id = driverId;
      await transactionalEntityManager.save(order);

      if (driverLoc) {
        driverLoc.active_order_id = order.id;
        await transactionalEntityManager.save(driverLoc);
      }

      this.logger.log(`Order ${order.id} accepted by driver ${driverId}`);
      return order;
    });
  }

  async cancelOrder(orderId: string, userId: string, role: Role): Promise<Order> {
    return await this.ordersRepository.manager.transaction(async (transactionalEntityManager) => {
      const order = await transactionalEntityManager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      if (!order) throw new NotFoundException('Order not found');

      if (role === Role.CUSTOMER) {
        if (order.customer_id !== userId) throw new ForbiddenException('Not your order');
        if (order.status === OrderStatus.IN_TRANSIT || order.status === OrderStatus.WAITING_FOR_FOOD) {
          throw new BadRequestException('Cannot cancel order at this stage');
        }
        
        order.status = OrderStatus.CANCELLED;
        
        if (order.driver_id) {
          const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: order.driver_id } });
          if (driverLoc) {
            driverLoc.active_order_id = null;
            await transactionalEntityManager.save(driverLoc);
          }
        }
      } else if (role === Role.DRIVER) {
        if (order.driver_id !== userId) throw new ForbiddenException('Not your order');
        
        // Driver cancels -> reset order so it finds another driver
        order.status = OrderStatus.FINDING_DRIVER;
        order.driver_id = null;
        
        const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: userId } });
        if (driverLoc) {
          driverLoc.active_order_id = null;
          await transactionalEntityManager.save(driverLoc);
        }
        
        this.eventEmitter.emit('order.created', order); // Re-trigger matching
      }

      this.logger.log(`Order ${order.id} cancelled by ${role} ${userId}`);
      return transactionalEntityManager.save(order);
    });
  }

  async submitReview(orderId: string, customerId: string, rating: number, feedback: string): Promise<Review> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    
    if (!order) throw new NotFoundException('Order not found');
    if (order.customer_id !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed orders');
    }

    const existingReview = await this.reviewsRepository.findOne({ where: { order_id: orderId } });
    if (existingReview) {
      throw new ConflictException('Order already reviewed');
    }

    const review = this.reviewsRepository.create({
      order_id: order.id,
      customer_id: customerId,
      driver_id: order.driver_id,
      rating,
      feedback,
    });

    return this.reviewsRepository.save(review);
  }

  async updateStatus(orderId: string, driverId: string, newStatus: OrderStatus): Promise<Order> {
    return await this.ordersRepository.manager.transaction(async (transactionalEntityManager) => {
      const order = await transactionalEntityManager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      if (!order) throw new NotFoundException('Order not found');
      if (order.driver_id !== driverId) throw new ForbiddenException('Not your order');

      const isValid = this.validateStateTransition(order.status, newStatus);
      if (!isValid) {
        throw new BadRequestException(`Cannot transition from ${order.status} to ${newStatus}`);
      }

      order.status = newStatus;

      // Release driver if completed
      if (newStatus === OrderStatus.COMPLETED) {
        const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: driverId } });
        if (driverLoc) {
          driverLoc.active_order_id = null;
          await transactionalEntityManager.save(driverLoc);
        }
      }

      await transactionalEntityManager.save(order);

      // Emit status changed event to TrackingGateway
      this.trackingGateway.server.to(`order_${order.id}`).emit('order:status_changed', {
        orderId: order.id,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Order ${order.id} status updated to ${newStatus} by driver ${driverId}`);
      return order;
    });
  }
}
