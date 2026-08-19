import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getRoute(pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }): Promise<RouteResult> {
    const osrmUrl = this.configService.get<string>('OSRM_URL', 'http://localhost:5000');
    // OSRM coordinates are in lng,lat format
    const coordinates = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
    const url = `${osrmUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
      };
    } catch (error) {
      this.logger.error(`Error fetching route from OSRM: ${error.message}`);
      throw new InternalServerErrorException('Failed to calculate route');
    }
  }
}
