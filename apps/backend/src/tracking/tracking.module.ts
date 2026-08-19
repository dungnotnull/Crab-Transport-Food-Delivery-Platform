import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { AuthModule } from '../auth/auth.module';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [AuthModule, DriversModule],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
