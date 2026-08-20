import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role, User } from '../users/entities/user.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(registerDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.usersService.findByPhoneNumber(registerDto.phone_number);
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const user = queryRunner.manager.create(User, {
        email: registerDto.email,
        password: hashedPassword,
        role: registerDto.role,
        full_name: registerDto.full_name,
        phone_number: registerDto.phone_number,
      });
      
      const savedUser = await queryRunner.manager.save(user);

      if (registerDto.role === Role.DRIVER) {
        const driverProfile = queryRunner.manager.create(DriverProfile, {
          user_id: savedUser.id,
          license_plate: registerDto.license_plate,
          vehicle_type: registerDto.vehicle_type as any,
          color: registerDto.color,
          vehicle_brand: registerDto.vehicle_brand,
          vehicle_image: registerDto.vehicle_image,
        });
        await queryRunner.manager.save(driverProfile);
      }

      await queryRunner.commitTransaction();
      const { password, ...result } = savedUser;
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err.code === '23505') { // Unique violation fallback
        throw new ConflictException('Data conflict (Email/Phone/License Plate already exists)');
      }
      throw new InternalServerErrorException('Failed to register user');
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is disabled');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const { password, ...userWithoutPassword } = user;
    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
