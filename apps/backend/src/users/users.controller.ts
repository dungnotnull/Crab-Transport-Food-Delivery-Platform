import { Controller, Get, Post, Body, Param, Patch, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admins')
  @Roles(Role.SYSTEM_ADMIN)
  async getAdmins() {
    return this.usersService.findAllAdmins();
  }

  @Post('admins')
  @Roles(Role.SYSTEM_ADMIN)
  async createAdmin(@Body() createDto: RegisterDto) {
    const existing = await this.usersService.findByEmail(createDto.email);
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    const admin = await this.usersService.createAdmin(createDto.email, hashedPassword);
    const { password, ...result } = admin;
    return result;
  }

  @Get('customers')
  @Roles(Role.SYSTEM_ADMIN, Role.ADMIN)
  async getCustomers() {
    return this.usersService.findAllCustomers();
  }

  @Get('drivers')
  @Roles(Role.SYSTEM_ADMIN, Role.ADMIN)
  async getDrivers() {
    return this.usersService.findAllDrivers();
  }

  @Patch(':id/toggle-active')
  @Roles(Role.SYSTEM_ADMIN, Role.ADMIN)
  async toggleActive(@Param('id') id: string, @Body('is_active') isActive: boolean) {
    try {
      const targetUser = await this.usersService.findById(id);
      if (!targetUser) throw new NotFoundException('User not found');
      
      // Prevent ADMIN from disabling SYSTEM_ADMIN
      if (targetUser.role === Role.SYSTEM_ADMIN) {
        throw new ConflictException('Cannot modify SYSTEM_ADMIN account');
      }

      const user = await this.usersService.toggleActive(id, isActive);
      const { password, ...result } = user;
      return result;
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      throw new NotFoundException(e.message);
    }
  }
}
