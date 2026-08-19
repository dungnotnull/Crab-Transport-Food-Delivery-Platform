import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverLocation } from './entities/driver-location.entity';
import { SystemConfigsService } from '../system-configs/system-configs.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(DriverLocation)
    private driverLocationRepo: Repository<DriverLocation>,
    private systemConfigsService: SystemConfigsService,
  ) {}

  async toggleOnlineStatus(driverId: string, isOnline: boolean): Promise<DriverLocation> {
    let location = await this.driverLocationRepo.findOne({ where: { user_id: driverId } });
    if (!location) {
      // Create if doesn't exist
      location = this.driverLocationRepo.create({
        user_id: driverId,
        is_online: isOnline,
      });
    } else {
      location.is_online = isOnline;
    }
    return this.driverLocationRepo.save(location);
  }

  async updateLocation(driverId: string, lat: number, lng: number): Promise<DriverLocation> {
    let location = await this.driverLocationRepo.findOne({ where: { user_id: driverId } });
    if (!location) {
      location = this.driverLocationRepo.create({ user_id: driverId });
    }
    location.current_location = {
      type: 'Point',
      coordinates: [lng, lat],
    };
    return this.driverLocationRepo.save(location);
  }

  async findAvailableDrivers(lng: number, lat: number, radiusInMeters: number = 3000, limit: number = 5) {
    const origin = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    const minBalance = await this.systemConfigsService.getValue('MIN_WALLET_BALANCE');

    return this.driverLocationRepo
      .createQueryBuilder('driverLocation')
      .innerJoin('driver_wallets', 'wallet', 'wallet.driver_id = driverLocation.user_id')
      .where('driverLocation.is_online = :isOnline', { isOnline: true })
      .andWhere('driverLocation.active_order_id IS NULL')
      .andWhere('wallet.status = :status', { status: 'ACTIVE' })
      .andWhere('wallet.balance >= :minBalance', { minBalance })
      .andWhere(
        'ST_DWithin(driverLocation.current_location::geography, ST_SetSRID(ST_GeomFromGeoJSON(:origin), 4326)::geography, :radius)',
        { origin: JSON.stringify(origin), radius: radiusInMeters }
      )
      .orderBy(
        'ST_Distance(driverLocation.current_location::geography, ST_SetSRID(ST_GeomFromGeoJSON(:origin), 4326)::geography)'
      )
      .limit(limit)
      .getMany();
  }
}
