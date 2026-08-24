import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, DiscountType } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService implements OnModuleInit {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private couponsRepository: Repository<Coupon>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCoupons();
  }

  private async seedDefaultCoupons() {
    const existingCount = await this.couponsRepository.count();
    if (existingCount === 0) {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      const defaultCoupons = [
        {
          code: 'WELCOME10K',
          discount_type: DiscountType.FIXED_AMOUNT,
          discount_value: 10000,
          min_trip_value: 20000,
          max_discount: 10000,
          usage_limit: 1000,
          used_count: 0,
          valid_from: now,
          valid_until: nextYear,
          is_active: true,
        },
        {
          code: 'CRAB50',
          discount_type: DiscountType.PERCENTAGE,
          discount_value: 50,
          min_trip_value: 30000,
          max_discount: 25000,
          usage_limit: 500,
          used_count: 0,
          valid_from: now,
          valid_until: nextYear,
          is_active: true,
        },
      ];

      for (const couponData of defaultCoupons) {
        const coupon = this.couponsRepository.create(couponData);
        await this.couponsRepository.save(coupon);
      }
      this.logger.log('Seeded default promotional coupons (WELCOME10K, CRAB50).');
    }
  }

  async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
    const formattedCode = createCouponDto.code.trim().toUpperCase();

    const existing = await this.couponsRepository.findOne({
      where: { code: formattedCode },
    });
    if (existing) {
      throw new ConflictException(`Coupon with code '${formattedCode}' already exists`);
    }

    const validFrom = createCouponDto.valid_from ? new Date(createCouponDto.valid_from) : new Date();
    const validUntil = new Date(createCouponDto.valid_until);

    if (validUntil <= validFrom) {
      throw new BadRequestException('valid_until must be after valid_from');
    }

    if (createCouponDto.discount_type === DiscountType.PERCENTAGE && createCouponDto.discount_value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const coupon = this.couponsRepository.create({
      ...createCouponDto,
      code: formattedCode,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: createCouponDto.is_active !== undefined ? createCouponDto.is_active : true,
      min_trip_value: createCouponDto.min_trip_value ?? 0,
      max_discount: createCouponDto.max_discount ?? null,
      used_count: 0,
    });

    return this.couponsRepository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponsRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findActive(): Promise<Coupon[]> {
    const now = new Date();
    return this.couponsRepository
      .createQueryBuilder('coupon')
      .where('coupon.is_active = :isActive', { isActive: true })
      .andWhere('coupon.valid_from <= :now', { now })
      .andWhere('coupon.valid_until >= :now', { now })
      .andWhere('coupon.used_count < coupon.usage_limit')
      .orderBy('coupon.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID '${id}' not found`);
    }
    return coupon;
  }

  async findByCode(code: string): Promise<Coupon> {
    const formattedCode = code.trim().toUpperCase();
    const coupon = await this.couponsRepository.findOne({ where: { code: formattedCode } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with code '${formattedCode}' not found`);
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    if (updateCouponDto.code) {
      const formattedCode = updateCouponDto.code.trim().toUpperCase();
      if (formattedCode !== coupon.code) {
        const existing = await this.couponsRepository.findOne({
          where: { code: formattedCode },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Coupon with code '${formattedCode}' already exists`);
        }
        coupon.code = formattedCode;
      }
    }

    const discountType = updateCouponDto.discount_type || coupon.discount_type;
    const discountValue =
      updateCouponDto.discount_value !== undefined
        ? Number(updateCouponDto.discount_value)
        : Number(coupon.discount_value);

    if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const validFrom = updateCouponDto.valid_from
      ? new Date(updateCouponDto.valid_from)
      : new Date(coupon.valid_from);
    const validUntil = updateCouponDto.valid_until
      ? new Date(updateCouponDto.valid_until)
      : new Date(coupon.valid_until);

    if (validUntil <= validFrom) {
      throw new BadRequestException('valid_until must be after valid_from');
    }

    Object.assign(coupon, {
      ...updateCouponDto,
      code: coupon.code,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: validFrom,
      valid_until: validUntil,
    });

    return this.couponsRepository.save(coupon);
  }

  async toggleActive(id: string, isActive?: boolean): Promise<Coupon> {
    const coupon = await this.findOne(id);
    coupon.is_active = isActive !== undefined ? isActive : !coupon.is_active;
    return this.couponsRepository.save(coupon);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const coupon = await this.findOne(id);
    await this.couponsRepository.remove(coupon);
    return { success: true, message: `Coupon '${coupon.code}' successfully deleted` };
  }

  async validateAndCalculateDiscount(
    code: string,
    originalFare: number,
  ): Promise<{ discountAmount: number; finalFare: number; coupon: Coupon }> {
    const formattedCode = code.trim().toUpperCase();
    const coupon = await this.couponsRepository.findOne({ where: { code: formattedCode, is_active: true } });
    if (!coupon) throw new BadRequestException('Invalid or inactive coupon');

    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      throw new BadRequestException('Coupon is expired or not yet valid');
    }

    if (coupon.used_count >= coupon.usage_limit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (originalFare < Number(coupon.min_trip_value)) {
      throw new BadRequestException(`Trip must be at least ${coupon.min_trip_value} VND to use this coupon`);
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

    const roundedDiscount = Math.round(discountAmount);
    const finalFare = Math.max(0, originalFare - roundedDiscount);

    return { discountAmount: roundedDiscount, finalFare, coupon };
  }
}
