import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, Role } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSystemAdmin();
  }

  private async seedSystemAdmin() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set in environment. Skipping seeder.');
      return;
    }

    const existingAdmin = await this.usersRepository.findOne({ where: { role: Role.SYSTEM_ADMIN } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const systemAdmin = this.usersRepository.create({
        email: adminEmail,
        password: hashedPassword,
        role: Role.SYSTEM_ADMIN,
        full_name: 'System Administrator',
        phone_number: null,
      });
      await this.usersRepository.save(systemAdmin);
      this.logger.log(`Seeded SYSTEM_ADMIN account with email: ${adminEmail}`);
    } else {
      this.logger.log('SYSTEM_ADMIN account already exists.');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { email },
      relations: {
        driverProfile: true,
      }
    });
  }

  async findByPhoneNumber(phone_number: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone_number } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAllCustomers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: Role.CUSTOMER },
      select: { id: true, email: true, full_name: true, phone_number: true, is_active: true, created_at: true },
    });
  }

  async findAllDrivers(): Promise<User[]> {
    return this.usersRepository.createQueryBuilder('user')
      .where('user.role = :role', { role: Role.DRIVER })
      .leftJoinAndSelect('user.driverProfile', 'driverProfile')
      .select([
        'user.id', 'user.email', 'user.full_name', 'user.phone_number', 'user.is_active', 'user.created_at',
        'driverProfile.license_plate', 'driverProfile.vehicle_type', 'driverProfile.color'
      ])
      .getMany();
  }

  async findAllAdmins(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: Role.ADMIN },
      select: { id: true, email: true, role: true, is_active: true, created_at: true },
    });
  }

  async createAdmin(email: string, passwordHash: string): Promise<User> {
    const admin = this.usersRepository.create({
      email,
      password: passwordHash,
      role: Role.ADMIN,
    });
    return this.usersRepository.save(admin);
  }

  async toggleActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    user.is_active = isActive;
    return this.usersRepository.save(user);
  }
}
