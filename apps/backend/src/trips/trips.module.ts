import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip } from './entities/trip.entity';
import { Review } from './entities/review.entity';
import { RoutingModule } from '../routing/routing.module';
import { PricingModule } from '../pricing/pricing.module';
import { DriversModule } from '../drivers/drivers.module';
import { TrackingModule } from '../tracking/tracking.module';
import { CouponsModule } from '../coupons/coupons.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Review]),
    RoutingModule,
    PricingModule,
    DriversModule,
    TrackingModule,
    CouponsModule,
    WalletsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
