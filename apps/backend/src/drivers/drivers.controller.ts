import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('api/v1/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Patch('status')
  @Roles(Role.DRIVER)
  async toggleStatus(@Req() req: any, @Body('is_online') isOnline: boolean) {
    const driverId = req.user.id;
    return this.driversService.toggleOnlineStatus(driverId, isOnline);
  }

  @Patch('location')
  @Roles(Role.DRIVER)
  async updateLocation(@Req() req: any, @Body() location: { lat: number; lng: number }) {
    const driverId = req.user.id;
    return this.driversService.updateLocation(driverId, location.lat, location.lng);
  }
}
