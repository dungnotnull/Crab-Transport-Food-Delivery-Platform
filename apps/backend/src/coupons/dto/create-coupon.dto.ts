import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  IsInt,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DiscountType } from '../entities/coupon.entity';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discount_value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_trip_value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_discount?: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  usage_limit: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  valid_from?: Date;

  @IsDate()
  @Type(() => Date)
  valid_until: Date;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalFare: number;
}
