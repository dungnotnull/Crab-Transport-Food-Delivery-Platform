import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Public routing endpoint — any authenticated user (CUSTOMER or DRIVER) can call.
 * Used by the Driver Simulator frontend to get OSRM route geometry without
 * being blocked by the CUSTOMER-only /trips/preview role guard.
 */
@Controller('api/v1/routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  /**
   * GET /api/v1/routing/route?fromLat=&fromLng=&toLat=&toLng=
   * Returns OSRM route geometry as a GeoJSON LineString coordinate array.
   */
  @Get('route')
  async getRoute(
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
    @Query('toLat') toLat: string,
    @Query('toLng') toLng: string,
  ) {
    const from = { lat: parseFloat(fromLat), lng: parseFloat(fromLng) };
    const to   = { lat: parseFloat(toLat),   lng: parseFloat(toLng)   };
    const result = await this.routingService.getRoute(from, to);
    return {
      data: {
        distance: result.distance,
        duration: result.duration,
        // geometry.coordinates is [[lng, lat], ...] — GeoJSON standard
        geometry: result.geometry,
      },
    };
  }
}
