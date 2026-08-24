import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DriverLocation } from './entities/driver-location.entity';
import { DriverProfile } from './entities/driver-profile.entity';
import { SystemConfigsModule } from '../system-configs/system-configs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverLocation, DriverProfile]),
    SystemConfigsModule,
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
