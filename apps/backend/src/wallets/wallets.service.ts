import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { DriverWallet, WalletStatus } from './entities/driver-wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';
import { SystemConfigsService } from '../system-configs/system-configs.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(DriverWallet)
    private walletsRepository: Repository<DriverWallet>,
    @InjectRepository(WalletTransaction)
    private transactionsRepository: Repository<WalletTransaction>,
    private systemConfigsService: SystemConfigsService,
  ) {}

  async createWallet(driverId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(DriverWallet) : this.walletsRepository;
    const existing = await repo.findOne({ where: { driver_id: driverId } });
    if (existing) return existing;
    
    const wallet = repo.create({ driver_id: driverId, balance: 0 });
    return await repo.save(wallet);
  }

  async getWallet(driverId: string) {
    let wallet = await this.walletsRepository.findOne({ where: { driver_id: driverId } });
    if (!wallet) {
      wallet = await this.createWallet(driverId);
    }
    return wallet;
  }

  async processTripRevenue(
    driverId: string,
    orderId: string,
    driverRevenue: number,
    customerPaid: number,
    manager: EntityManager,
  ) {
    const walletRepo = manager.getRepository(DriverWallet);
    const txRepo = manager.getRepository(WalletTransaction);

    // Pessimistic Lock on Driver Wallet
    let wallet = await walletRepo
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.driver_id = :id', { id: driverId })
      .getOne();

    if (!wallet) {
      wallet = walletRepo.create({ driver_id: driverId, balance: 0 });
      await walletRepo.save(wallet);
    }

    // Biến động ví: Wallet Balance += driverRevenue - customerPaid
    // Ví dụ: Doanh thu 40k, khách trả tiền mặt 30k => Ví + 10k (Công ty bù)
    // Ví dụ 2: Doanh thu 40k, khách đưa 50k => Ví - 10k (Tiền phế nộp cty)
    const amountChanged = driverRevenue - customerPaid;
    wallet.balance = Number(wallet.balance) + amountChanged;

    const minBalance = await this.systemConfigsService.getValue('MIN_WALLET_BALANCE');
    if (wallet.balance < minBalance) {
      wallet.status = WalletStatus.BLOCKED;
    } else {
      wallet.status = WalletStatus.ACTIVE;
    }

    await walletRepo.save(wallet);

    let txType = TransactionType.TRIP_REVENUE;
    if (amountChanged < 0) txType = TransactionType.PLATFORM_FEE;

    const transaction = txRepo.create({
      driver_id: driverId,
      order_id: orderId,
      transaction_type: txType,
      amount: amountChanged,
      balance_after: wallet.balance,
      description: `Thu nhập/Khấu trừ từ chuyến đi ${orderId}`,
    });

    await txRepo.save(transaction);
  }
}
