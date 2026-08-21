import { Controller, Post, Patch, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { BookTripDto } from './dto/book-trip.dto';
import { DriversService } from '../drivers/drivers.service';
import { TripStatus } from './entities/trip.entity';

@Controller('api/v1/trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService, private readonly driversService: DriversService) {}

  @Get('test-match')
  async testMatch() {
    const drivers = await this.driversService.findAvailableDrivers(106.68937, 10.782363, 'CAR_4', 3000, 5);
    return { count: drivers.length, drivers };
  }

  @Post('preview')
  @Roles(Role.CUSTOMER)
  async previewTrip(@Body() bookTripDto: BookTripDto) {
    return this.tripsService.previewTrip(bookTripDto);
  }

  @Post('book')
  @Roles(Role.CUSTOMER)
  async bookTrip(@Req() req: any, @Body() bookTripDto: BookTripDto) {
    const customerId = req.user.id;
    return this.tripsService.bookTrip(customerId, bookTripDto);
  }

  @Post(':id/accept')
  @Roles(Role.DRIVER)
  async acceptTrip(@Req() req: any, @Param('id') tripId: string) {
    const driverId = req.user.id;
    return this.tripsService.acceptTrip(tripId, driverId);
  }

  @Post(':id/cancel')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async cancelTrip(@Req() req: any, @Param('id') tripId: string) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.tripsService.cancelTrip(tripId, userId, role);
  }

  @Post(':id/rating')
  @Roles(Role.CUSTOMER)
  async submitReview(
    @Req() req: any,
    @Param('id') tripId: string,
    @Body('rating') rating: number,
    @Body('feedback') feedback: string,
  ) {
    const customerId = req.user.id;
    return this.tripsService.submitReview(tripId, customerId, rating, feedback);
  }

  @Patch(':id/status')
  @Roles(Role.DRIVER)
  async updateStatus(
    @Req() req: any,
    @Param('id') tripId: string,
    @Body('status') status: TripStatus,
  ) {
    const driverId = req.user.id;
    return this.tripsService.updateStatus(tripId, driverId, status);
  }

  @Get('driver/history')
  @Roles(Role.DRIVER)
  async getDriverHistory(@Req() req: any) {
    return this.tripsService.getDriverHistory(req.user.id);
  }

  @Get('customer/history')
  @Roles(Role.CUSTOMER)
  async getCustomerHistory(@Req() req: any) {
    return this.tripsService.getCustomerHistory(req.user.id);
  }

  @Get('active')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async getActiveTrip(@Req() req: any) {
    return this.tripsService.getActiveTrip(req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async getTripDetails(@Req() req: any, @Param('id') id: string) {
    return this.tripsService.getTripDetails(id, req.user.id, req.user.role);
  }
}
