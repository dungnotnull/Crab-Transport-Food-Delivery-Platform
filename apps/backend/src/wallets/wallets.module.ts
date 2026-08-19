import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { DriverWallet } from './entities/driver-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { SystemConfigsModule } from '../system-configs/system-configs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverWallet, WalletTransaction]),
    SystemConfigsModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
