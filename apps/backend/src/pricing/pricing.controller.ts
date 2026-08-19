import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('api/v1/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('weather')
  getWeatherStatus() {
    return this.pricingService.getWeatherStatus();
  }

  @Post('weather')
  @Roles(Role.SYSTEM_ADMIN, Role.ADMIN)
  setWeatherStatus(@Body('isRaining') isRaining: boolean) {
    this.pricingService.setExtremeWeather(isRaining);
    return this.pricingService.getWeatherStatus();
  }
}
