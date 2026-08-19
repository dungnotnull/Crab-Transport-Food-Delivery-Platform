import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly BASE_FARE = 15000; // VND
  private readonly RATE_PER_KM = 5000; // VND per km
  private isExtremeWeather = false;

  setExtremeWeather(isRaining: boolean) {
    this.isExtremeWeather = isRaining;
    this.logger.log(`Extreme weather condition set to: ${isRaining}`);
  }

  getWeatherStatus() {
    return { isExtremeWeather: this.isExtremeWeather };
  }
  
  calculateFare(distanceInMeters: number, serviceType: string = 'STANDARD'): number {
    const distanceInKm = distanceInMeters / 1000;
    let surge = 1.0;
    
    // Simulate some basic surge pricing logic based on service type
    if (serviceType === 'PREMIUM') {
      surge += 0.5;
    }

    // Advanced: Extreme weather surge
    if (this.isExtremeWeather) {
      surge += 0.5; // +50% fee for bad weather
    }

    // Base + (Dist * Rate) * Surge
    let totalFare = this.BASE_FARE + (distanceInKm * this.RATE_PER_KM);
    totalFare = totalFare * surge;

    // Round to nearest 1000 VND
    return Math.round(totalFare / 1000) * 1000;
  }
}
