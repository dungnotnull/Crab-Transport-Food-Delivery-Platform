import { IsNumber, ValidateNested, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/trip.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class BookOrderDto {
  @ValidateNested()
  @Type(() => LocationDto)
  pickup: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  dropoff: LocationDto;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
