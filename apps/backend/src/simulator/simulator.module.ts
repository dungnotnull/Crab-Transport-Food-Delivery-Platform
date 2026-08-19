import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { RoutingModule } from '../routing/routing.module';
import { TrackingModule } from '../tracking/tracking.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [RoutingModule, TrackingModule, OrdersModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule {}
