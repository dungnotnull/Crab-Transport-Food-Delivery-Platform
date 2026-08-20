import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('statistics')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async getStatistics() {
    const stats = await this.adminService.getDashboardStatistics();
    return {
      statusCode: 200,
      message: 'Success',
      data: stats,
    };
  }
}
