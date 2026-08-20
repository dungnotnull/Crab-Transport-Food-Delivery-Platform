import { Injectable, BadRequestException, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Trip, TripStatus, PaymentMethod, PaymentStatus } from './entities/trip.entity';
import { Review } from './entities/review.entity';
import { BookTripDto } from './dto/book-trip.dto';
import { RoutingService } from '../routing/routing.service';
import { PricingService } from '../pricing/pricing.service';
import { DriversService } from '../drivers/drivers.service';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { Role } from '../users/entities/user.entity';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { CouponsService } from '../coupons/coupons.service';
import { WalletsService } from '../wallets/wallets.service';
import { WalletStatus } from '../wallets/entities/driver-wallet.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private routingService: RoutingService,
    private pricingService: PricingService,
    private eventEmitter: EventEmitter2,
    private driversService: DriversService,
    private trackingGateway: TrackingGateway,
    private couponsService: CouponsService,
    private walletsService: WalletsService,
  ) {}

  async previewTrip(bookTripDto: BookTripDto) {
    const route = await this.routingService.getRoute(bookTripDto.pickup, bookTripDto.dropoff);
    // Distance limit removed to allow booking anywhere

    // Get pricing without coupon first
    const basePricing = await this.pricingService.calculateFare(route.distance, bookTripDto.vehicleType);
    let finalPricing = basePricing;
    let couponResult: any = null;

    if (bookTripDto.coupon_code) {
      couponResult = await this.couponsService.validateAndCalculateDiscount(bookTripDto.coupon_code, basePricing.originalFare);
      finalPricing = await this.pricingService.calculateFare(route.distance, bookTripDto.vehicleType, couponResult.discountAmount);
    }

    return {
      distance: route.distance,
      duration: route.duration,
      fare: finalPricing.totalFare,
      original_fare: finalPricing.originalFare,
      discount_amount: finalPricing.discountAmount,
      geometry: route.geometry,
    };
  }

  async bookTrip(customerId: string, bookTripDto: BookTripDto): Promise<Trip> {
    const { pickup, dropoff, coupon_code, paymentMethod, vehicleType } = bookTripDto;

    const route = await this.routingService.getRoute(pickup, dropoff);
    // Distance limit removed to allow booking anywhere

    const savedTrip = await this.tripsRepository.manager.transaction(async (transactionalEntityManager) => {
      const basePricing = await this.pricingService.calculateFare(route.distance, vehicleType);
      let finalPricing = basePricing;

      if (coupon_code) {
        // Validation + lock coupon to prevent race condition
        const couponResult = await this.couponsService.validateAndCalculateDiscount(coupon_code, basePricing.originalFare);
        
        const couponRepo = transactionalEntityManager.getRepository('Coupon');
        const lockedCoupon = await couponRepo
          .createQueryBuilder('coupon')
          .setLock('pessimistic_write')
          .where('coupon.code = :code', { code: coupon_code })
          .getOne();

        if (!lockedCoupon) {
          throw new NotFoundException('Coupon not found');
        }

        if (lockedCoupon.used_count >= lockedCoupon.usage_limit) {
          throw new ConflictException('Coupon was just used up by someone else');
        }

        lockedCoupon.used_count += 1;
        await transactionalEntityManager.save(lockedCoupon);

        finalPricing = await this.pricingService.calculateFare(route.distance, vehicleType, couponResult.discountAmount);
      }

      const trip = transactionalEntityManager.create(Trip, {
        customer_id: customerId,
        pickup_location: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        dropoff_location: { type: 'Point', coordinates: [dropoff.lng, dropoff.lat] },
        vehicle_type: vehicleType,
        status: TripStatus.FINDING_DRIVER,
        original_fare: finalPricing.originalFare,
        coupon_code: coupon_code || null,
        discount_amount: finalPricing.discountAmount,
        platform_fee: finalPricing.platformFee,
        driver_revenue: finalPricing.driverRevenue,
        total_fare: finalPricing.totalFare,
        payment_method: paymentMethod || PaymentMethod.CASH,
        payment_status: PaymentStatus.PENDING,
        estimated_duration: Math.ceil(route.duration / 60),
      });

      return await transactionalEntityManager.save(trip);
    });

    this.eventEmitter.emit('trip.created', savedTrip);
    this.logger.log(`Trip ${savedTrip.id} booked. Fare: ${savedTrip.total_fare}`);

    return savedTrip;
  }

  @Cron('0 * * * * *') // Run every minute
  async handleTimeoutTrips() {
    this.logger.debug('Running cronjob: handleTimeoutTrips');
    
    // Find trips in FINDING_DRIVER status older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const staleTrips = await this.tripsRepository.find({
      where: {
        status: TripStatus.FINDING_DRIVER,
        created_at: LessThan(fiveMinutesAgo),
      },
    });

    if (staleTrips.length > 0) {
      for (const trip of staleTrips) {
        trip.status = TripStatus.CANCELLED;
        await this.tripsRepository.save(trip);
        this.logger.log(`Trip ${trip.id} automatically cancelled due to timeout`);
        
        // Emit event to Frontend via Websocket
        this.trackingGateway.server.to(`trip_${trip.id}`).emit('trip:status_changed', {
          tripId: trip.id,
          status: TripStatus.CANCELLED,
          reason: 'TIMEOUT',
        });
      }
    }
  }

  @Cron('*/30 * * * * *') // Run every 30 seconds
  async handleStaleAcceptedTrips() {
    this.logger.debug('Running cronjob: handleStaleAcceptedTrips (SLA Check)');
    
    const acceptedTrips = await this.tripsRepository.find({
      where: {
        status: TripStatus.ACCEPTED,
      },
      relations: { driver: true },
    });

    for (const trip of acceptedTrips) {
      // SLA = estimated_duration + 5 minutes
      const slaMinutes = trip.estimated_duration + 5;
      
      // Fix TypeORM parsing UTC without timezone as local time
      const tzOffsetMs = new Date().getTimezoneOffset() * 60 * 1000;
      const correctUpdatedAt = new Date(trip.updated_at.getTime() - tzOffsetMs);
      
      const slaTimeLimit = new Date(correctUpdatedAt.getTime() + slaMinutes * 60 * 1000);
      
      if (new Date() > slaTimeLimit) {
        this.logger.warn(`Trip ${trip.id} SLA exceeded by driver ${trip.driver_id}. Cancelling...`);
        
        // Block the driver's wallet as a penalty
        if (trip.driver_id) {
          try {
            await this.walletsService.updateWalletStatus(trip.driver_id, WalletStatus.BLOCKED);
            this.logger.log(`Driver ${trip.driver_id} wallet BLOCKED due to SLA violation`);
          } catch (e) {
            this.logger.error(`Failed to block wallet for driver ${trip.driver_id}: ${e.message}`);
          }
          
          // Free up driver
          const driverLoc = await this.tripsRepository.manager.findOne(DriverLocation, { where: { user_id: trip.driver_id } });
          if (driverLoc) {
            driverLoc.active_trip_id = null;
            await this.tripsRepository.manager.save(driverLoc);
          }
        }

        trip.status = TripStatus.CANCELLED;
        trip.driver_id = null;
        await this.tripsRepository.save(trip);
        
        this.trackingGateway.server.to(`trip_${trip.id}`).emit('trip:status_changed', {
          tripId: trip.id,
          status: TripStatus.CANCELLED,
          reason: 'DRIVER_NO_SHOW_SLA_VIOLATION',
        });
      }
    }
  }


  validateStateTransition(current: TripStatus, next: TripStatus): boolean {
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.FINDING_DRIVER]: [TripStatus.ACCEPTED, TripStatus.CANCELLED],
      [TripStatus.ACCEPTED]: [TripStatus.DRIVER_ARRIVING, TripStatus.ARRIVED_AT_PICKUP, TripStatus.CANCELLED],
      [TripStatus.DRIVER_ARRIVING]: [TripStatus.ARRIVED_AT_PICKUP, TripStatus.CANCELLED],
      [TripStatus.ARRIVED_AT_PICKUP]: [TripStatus.IN_TRANSIT, TripStatus.CANCELLED],
      [TripStatus.IN_TRANSIT]: [TripStatus.ARRIVED_AT_DESTINATION],
      [TripStatus.ARRIVED_AT_DESTINATION]: [TripStatus.COMPLETED],
      [TripStatus.COMPLETED]: [],
      [TripStatus.CANCELLED]: [TripStatus.FINDING_DRIVER], // Driver cancel can revert back to FINDING_DRIVER
    };

    return validTransitions[current]?.includes(next) ?? false;
  }

  @OnEvent('trip.created')
  async handleTripCreated(trip: Trip) {
    this.logger.log(`Handling dispatch for trip ${trip.id}`);
    const [lng, lat] = trip.pickup_location.coordinates;
    const availableDrivers = await this.driversService.findAvailableDrivers(lng, lat, trip.vehicle_type, 3000, 5);

    if (availableDrivers.length === 0) {
      this.logger.warn(`No available drivers found for trip ${trip.id}`);
      return;
    }

    this.logger.log(`Found ${availableDrivers.length} drivers for trip ${trip.id}. Dispatching...`);
    
    // Broadcast via Socket.io to the drivers
    availableDrivers.forEach(driver => {
      this.logger.debug(`Offer trip ${trip.id} to driver ${driver.user_id}`);
      this.trackingGateway.emitOrderOffer(driver.user_id, {
        tripId: trip.id,
        pickup: trip.pickup_location,
        dropoff: trip.dropoff_location,
        fare: trip.total_fare,
        expiredAt: new Date(Date.now() + 15 * 1000).toISOString(), // 15s TTL
      });
    });
  }

  async acceptTrip(tripId: string, driverId: string): Promise<Trip> {
    const acceptedTrip = await this.tripsRepository.manager.transaction(async (transactionalEntityManager) => {
      const trip = await transactionalEntityManager
        .createQueryBuilder(Trip, 'trip')
        .setLock('pessimistic_write')
        .where('trip.id = :id', { id: tripId })
        .getOne();

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      if (trip.status !== TripStatus.FINDING_DRIVER) {
        throw new ConflictException('Trip has already been accepted or cancelled');
      }

      const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: driverId } });
      if (driverLoc && driverLoc.active_trip_id) {
        throw new ConflictException('Driver is already on an active trip');
      }

      trip.status = TripStatus.ACCEPTED;
      trip.driver_id = driverId;
      await transactionalEntityManager.save(trip);

      if (driverLoc) {
        driverLoc.active_trip_id = trip.id;
        await transactionalEntityManager.save(driverLoc);
      }

      this.logger.log(`Trip ${trip.id} accepted by driver ${driverId}`);
      return trip;
    });

    this.trackingGateway.server.to(`trip_${acceptedTrip.id}`).emit('trip:status_changed', {
      tripId: acceptedTrip.id,
      status: TripStatus.ACCEPTED,
      timestamp: new Date().toISOString(),
    });

    return acceptedTrip;
  }

  async cancelTrip(tripId: string, userId: string, role: Role): Promise<Trip> {
    return await this.tripsRepository.manager.transaction(async (transactionalEntityManager) => {
      const trip = await transactionalEntityManager
        .createQueryBuilder(Trip, 'trip')
        .setLock('pessimistic_write')
        .where('trip.id = :id', { id: tripId })
        .getOne();

      if (!trip) throw new NotFoundException('Trip not found');

      if (role === Role.CUSTOMER) {
        if (trip.customer_id !== userId) throw new ForbiddenException('Not your trip');
        if (trip.status === TripStatus.IN_TRANSIT) {
          throw new BadRequestException('Cannot cancel trip while in transit');
        }
        
        trip.status = TripStatus.CANCELLED;
        
        if (trip.driver_id) {
          const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: trip.driver_id } });
          if (driverLoc) {
            driverLoc.active_trip_id = null;
            await transactionalEntityManager.save(driverLoc);
          }
        }
      } else if (role === Role.DRIVER) {
        if (trip.driver_id !== userId) throw new ForbiddenException('Not your trip');
        
        // Driver cancels -> reset trip so it finds another driver
        trip.status = TripStatus.FINDING_DRIVER;
        trip.driver_id = null;
        
        const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: userId } });
        if (driverLoc) {
          driverLoc.active_trip_id = null;
          await transactionalEntityManager.save(driverLoc);
        }
        
        this.eventEmitter.emit('trip.created', trip); // Re-trigger matching
      }

      this.logger.log(`Trip ${trip.id} cancelled by ${role} ${userId}`);
      return transactionalEntityManager.save(trip);
    });
  }

  async submitReview(tripId: string, customerId: string, rating: number, feedback: string): Promise<Review> {
    const trip = await this.tripsRepository.findOne({ where: { id: tripId } });
    
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.customer_id !== customerId) throw new ForbiddenException('Not your trip');
    if (trip.status !== TripStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed trips');
    }

    const existingReview = await this.reviewsRepository.findOne({ where: { trip_id: tripId } });
    if (existingReview) {
      throw new ConflictException('Trip already reviewed');
    }

    const review = this.reviewsRepository.create({
      trip_id: trip.id,
      customer_id: customerId,
      driver_id: trip.driver_id!,
      rating,
      feedback,
    });

    const savedReview = await this.reviewsRepository.save(review);
    
    // Calculate new average rating
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average_rating')
      .where('review.driver_id = :driverId', { driverId: trip.driver_id })
      .getRawOne();
      
    const newAverage = result.average_rating ? parseFloat(result.average_rating) : rating;
    
    // Update DriverProfile
    await this.tripsRepository.manager
      .createQueryBuilder()
      .update('driver_profiles')
      .set({ average_rating: newAverage })
      .where('user_id = :driverId', { driverId: trip.driver_id })
      .execute();
      
    return savedReview;
  }

  async updateStatus(tripId: string, driverId: string, newStatus: TripStatus): Promise<Trip> {
    return await this.tripsRepository.manager.transaction(async (transactionalEntityManager) => {
      const trip = await transactionalEntityManager
        .createQueryBuilder(Trip, 'trip')
        .setLock('pessimistic_write')
        .where('trip.id = :id', { id: tripId })
        .getOne();

      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.driver_id !== driverId) throw new ForbiddenException('Not your trip');

      const isValid = this.validateStateTransition(trip.status, newStatus);
      if (!isValid) {
        throw new BadRequestException(`Cannot transition from ${trip.status} to ${newStatus}`);
      }

      trip.status = newStatus;

      // Release driver if completed and calculate wallet
      if (newStatus === TripStatus.COMPLETED) {
        const driverLoc = await transactionalEntityManager.findOne(DriverLocation, { where: { user_id: driverId } });
        if (driverLoc) {
          driverLoc.active_trip_id = null;
          await transactionalEntityManager.save(driverLoc);
        }

        trip.payment_status = PaymentStatus.PAID;

        const customerPaidToDriver = trip.payment_method === PaymentMethod.CASH ? Number(trip.total_fare) : 0;

        await this.walletsService.processTripRevenue(
          driverId,
          trip.id,
          Number(trip.driver_revenue),
          customerPaidToDriver,
          transactionalEntityManager,
        );
      }

      await transactionalEntityManager.save(trip);

      // Emit status changed event to TrackingGateway
      this.trackingGateway.server.to(`trip_${trip.id}`).emit('trip:status_changed', {
        tripId: trip.id,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Trip ${trip.id} status updated to ${newStatus} by driver ${driverId}`);
      return trip;
    });
  }

  async getTripDetails(tripId: string, userId: string, role: Role): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { id: tripId },
      relations: {
        customer: true,
        driver: {
          driverProfile: true,
        },
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    if (role === Role.CUSTOMER && trip.customer_id !== userId) {
      throw new ForbiddenException('Not your trip');
    }
    if (role === Role.DRIVER && trip.driver_id && trip.driver_id !== userId) {
      throw new ForbiddenException('Not your trip');
    }

    return trip;
  }

  async getDriverHistory(driverId: string): Promise<Trip[]> {
    return this.tripsRepository.find({
      where: { driver_id: driverId },
      order: { created_at: 'DESC' },
    });
  }

  async getCustomerHistory(customerId: string): Promise<Trip[]> {
    return this.tripsRepository.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
      relations: {
        driver: {
          driverProfile: true,
        },
      },
    });
  }

  async getActiveTrip(userId: string, role: Role): Promise<Trip | null> {
    const query = this.tripsRepository.createQueryBuilder('trip')
      .leftJoinAndSelect('trip.customer', 'customer')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.driverProfile', 'driverProfile')
      .where('trip.status NOT IN (:...statuses)', { statuses: [TripStatus.COMPLETED, TripStatus.CANCELLED] });

    if (role === Role.CUSTOMER) {
      query.andWhere('trip.customer_id = :userId', { userId });
    } else {
      query.andWhere('trip.driver_id = :userId', { userId });
    }

    return query.getOne();
  }
}
