import { IsEmail, IsNotEmpty, MinLength, IsEnum, ValidateIf } from 'class-validator';
import { Role } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty()
  full_name: string;

  @IsNotEmpty()
  phone_number: string;

  @IsEnum([Role.CUSTOMER, Role.DRIVER], {
    message: 'Role must be either CUSTOMER or DRIVER',
  })
  role: Role.CUSTOMER | Role.DRIVER;

  // Driver specific fields
  @ValidateIf(o => o.role === Role.DRIVER)
  @IsNotEmpty()
  license_plate?: string;

  @ValidateIf(o => o.role === Role.DRIVER)
  @IsNotEmpty()
  vehicle_type?: string;

  @ValidateIf(o => o.role === Role.DRIVER)
  color?: string;

  @ValidateIf(o => o.role === Role.DRIVER)
  @IsNotEmpty()
  vehicle_brand?: string;

  @ValidateIf(o => o.role === Role.DRIVER)
  vehicle_image?: string;
}
