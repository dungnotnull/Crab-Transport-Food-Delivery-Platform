import { IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsEnum([Role.CUSTOMER, Role.DRIVER], {
    message: 'Role must be either CUSTOMER or DRIVER',
  })
  role: Role.CUSTOMER | Role.DRIVER;
}
