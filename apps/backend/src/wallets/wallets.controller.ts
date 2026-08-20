import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('api/v1/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @Roles(Role.DRIVER)
  async getMyWallet(@Req() req: any) {
    return this.walletsService.getWalletDetails(req.user.id);
  }
}
