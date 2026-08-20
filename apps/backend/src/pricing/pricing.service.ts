import { Injectable, Logger } from '@nestjs/common';
import { SystemConfigsService } from '../system-configs/system-configs.service';
import { VehicleType } from '../common/enums/vehicle-type.enum';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private isExtremeWeather = false;

  constructor(private systemConfigsService: SystemConfigsService) {}

  setExtremeWeather(isRaining: boolean) {
    this.isExtremeWeather = isRaining;
    this.logger.log(`Extreme weather condition set to: ${isRaining}`);
  }

  getWeatherStatus() {
    return { isExtremeWeather: this.isExtremeWeather };
  }
  
  async calculateFare(distanceInMeters: number, vehicleType: VehicleType, discountAmount: number = 0) {
    const distanceInKm = distanceInMeters / 1000;
    let surge = 1.0;
    
    if (this.isExtremeWeather) {
      surge += 0.5;
    }

    const baseFare = await this.systemConfigsService.getValue(`BASE_FARE_${vehicleType}`);
    const ratePerKm = await this.systemConfigsService.getValue(`RATE_PER_KM_${vehicleType}`);
    const commissionPercent = await this.systemConfigsService.getValue('PLATFORM_COMMISSION_PERCENT');

    let originalFare = baseFare + (distanceInKm * ratePerKm);
    originalFare = originalFare * surge;
    originalFare = Math.round(originalFare / 1000) * 1000;

    let totalFare = originalFare - discountAmount;
    if (totalFare < 0) totalFare = 0;

    const platformFee = Math.round(originalFare * commissionPercent);
    const driverRevenue = originalFare - platformFee;

    return {
      originalFare,
      discountAmount,
      totalFare,
      platformFee,
      driverRevenue,
    };
  }
}
