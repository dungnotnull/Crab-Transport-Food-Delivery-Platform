import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { RoutingModule } from '../routing/routing.module';
import { TrackingModule } from '../tracking/tracking.module';
import { TripsModule } from '../trips/trips.module';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [RoutingModule, TrackingModule, TripsModule, DriversModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule {}
