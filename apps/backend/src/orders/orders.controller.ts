import { Controller, Post, Patch, Body, UseGuards, Req, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { BookOrderDto } from './dto/book-order.dto';

@Controller('api/v1/orders')
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
  async acceptOrder(@Req() req: any, @Param('id') orderId: string) {
    const driverId = req.user.id;
    return this.ordersService.acceptOrder(orderId, driverId);
  }

  @Post(':id/cancel')
  @Roles(Role.CUSTOMER, Role.DRIVER)
  async cancelOrder(@Req() req: any, @Param('id') orderId: string) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.cancelOrder(orderId, userId, role);
  }

  @Post(':id/rating')
  @Roles(Role.CUSTOMER)
  async submitReview(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body('rating') rating: number,
    @Body('feedback') feedback: string,
  ) {
    const customerId = req.user.id;
    return this.ordersService.submitReview(orderId, customerId, rating, feedback);
  }

  @Patch(':id/status')
  @Roles(Role.DRIVER)
  async updateStatus(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body('status') status: any, // should be OrderStatus enum
  ) {
    const driverId = req.user.id;
    return this.ordersService.updateStatus(orderId, driverId, status);
  }
}
