import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../users/entities/user.entity';
import { Trip, OrderStatus } from '../trips/entities/trip.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
  ) {}

  async getDashboardStatistics() {
    const totalCustomers = await this.usersRepository.count({
      where: { role: Role.CUSTOMER },
    });

    const totalDrivers = await this.usersRepository.count({
      where: { role: Role.DRIVER },
    });

    const totalTrips = await this.tripsRepository.count();

    const { sum } = await this.tripsRepository
      .createQueryBuilder('trip')
      .select('SUM(trip.total_fare)', 'sum')
      .where('trip.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalCustomers,
      totalDrivers,
      totalTrips,
      totalRevenue: Number(sum) || 0,
    };
  }
}
