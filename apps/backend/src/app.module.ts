import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoutingModule } from './routing/routing.module';
import { PricingModule } from './pricing/pricing.module';
import { OrdersModule } from './trips/trips.module';
import { DriversModule } from './drivers/drivers.module';
import { TrackingModule } from './tracking/tracking.module';
import { SimulatorModule } from './simulator/simulator.module';
import { SystemConfigsModule } from './system-configs/system-configs.module';
import { CouponsModule } from './coupons/coupons.module';
import { WalletsModule } from './wallets/wallets.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Note: Use migrations in production
        logging: true,
      }),
    }),
    AuthModule,
    UsersModule,
    RoutingModule,
    PricingModule,
    OrdersModule,
    DriversModule,
    TrackingModule,
    SimulatorModule,
    SystemConfigsModule,
    CouponsModule,
    WalletsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
