import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Coupon, DiscountType } from './entities/coupon.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponsRepository: Repository<Coupon>,
  ) {}

  async validateAndCalculateDiscount(code: string, originalFare: number): Promise<{ discountAmount: number, coupon: Coupon }> {
    const coupon = await this.couponsRepository.findOne({ where: { code, is_active: true } });
    if (!coupon) throw new BadRequestException('Invalid or inactive coupon');

    const now = new Date();
    if (coupon.valid_from > now || coupon.valid_until < now) {
      throw new BadRequestException('Coupon is expired or not yet valid');
    }

    if (coupon.used_count >= coupon.usage_limit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (originalFare < coupon.min_trip_value) {
      throw new BadRequestException(`Trip must be at least ${coupon.min_trip_value} to use this coupon`);
    }

    let discountAmount = 0;
    if (coupon.discount_type === DiscountType.FIXED_AMOUNT) {
      discountAmount = Number(coupon.discount_value);
    } else if (coupon.discount_type === DiscountType.PERCENTAGE) {
      discountAmount = originalFare * (Number(coupon.discount_value) / 100);
      if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
        discountAmount = Number(coupon.max_discount);
      }
    }

    if (discountAmount > originalFare) {
      discountAmount = originalFare;
    }

    return { discountAmount: Math.round(discountAmount), coupon };
  }
}
