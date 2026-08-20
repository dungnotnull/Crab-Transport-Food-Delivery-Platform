import { Controller, Post, Patch, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { OrdersService } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { BookOrderDto } from './dto/book-trip.dto';

@Controller('api/v1/trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview')
  @Roles(Role.CUSTOMER)
  async previewOrder(@Body() bookOrderDto: BookOrderDto) {
    return this.ordersService.previewOrder(bookOrderDto);
  }

  @Post('book')
  @Roles(Role.CUSTOMER)
  async bookOrder(@Req() req: any, @Body() bookOrderDto: BookOrderDto) {
    const customerId = req.user.id;
    return this.ordersService.bookOrder(customerId, bookOrderDto);
  }

  @Post(':id/accept')
  @Roles(Role.DRIVER)
  async acceptOrder(@Req() req: any, @Param('id') tripId: string) {
    const driverId = req.user.id;
    return this.ordersService.acceptOrder(tripId, driverId);
  }

  @Post(':id/cancel')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async cancelOrder(@Req() req: any, @Param('id') tripId: string) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.cancelOrder(tripId, userId, role);
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
    return this.ordersService.submitReview(tripId, customerId, rating, feedback);
  }

  @Patch(':id/status')
  @Roles(Role.DRIVER)
  async updateStatus(
    @Req() req: any,
    @Param('id') tripId: string,
    @Body('status') status: any, // should be OrderStatus enum
  ) {
    const driverId = req.user.id;
    return this.ordersService.updateStatus(tripId, driverId, status);
  }

  @Get('driver/history')
  @Roles(Role.DRIVER)
  async getDriverHistory(@Req() req: any) {
    return this.ordersService.getDriverHistory(req.user.id);
  }

  @Get('customer/history')
  @Roles(Role.CUSTOMER)
  async getCustomerHistory(@Req() req: any) {
    return this.ordersService.getCustomerHistory(req.user.id);
  }

  @Get('active')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async getActiveTrip(@Req() req: any) {
    return this.ordersService.getActiveTrip(req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async getTripDetails(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getTripDetails(id, req.user.id, req.user.role);
  }
}
