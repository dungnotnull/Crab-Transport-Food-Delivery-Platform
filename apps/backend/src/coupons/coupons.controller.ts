import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('api/v1/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async findAll() {
    return this.couponsService.findAll();
  }

  @Get('active')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SYSTEM_ADMIN)
  async findActive() {
    return this.couponsService.findActive();
  }

  @Post('validate')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SYSTEM_ADMIN)
  async validateCoupon(@Body() validateCouponDto: ValidateCouponDto) {
    return this.couponsService.validateAndCalculateDiscount(
      validateCouponDto.code,
      validateCouponDto.originalFare,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async toggleActive(
    @Param('id') id: string,
    @Body('is_active') isActive?: boolean,
  ) {
    return this.couponsService.toggleActive(id, isActive);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  async remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
