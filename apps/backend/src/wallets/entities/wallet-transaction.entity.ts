import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DriverWallet } from './driver-wallet.entity';
import { Order } from '../../orders/entities/order.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT', // Nạp tiền
  WITHDRAWAL = 'WITHDRAWAL', // Rút tiền
  TRIP_REVENUE = 'TRIP_REVENUE', // Tiền chuyến đi
  PLATFORM_FEE = 'PLATFORM_FEE', // Chiết khấu
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  driver_id: string;

  @ManyToOne(() => DriverWallet)
  @JoinColumn({ name: 'driver_id' })
  wallet: DriverWallet;

  @Column('uuid', { nullable: true })
  order_id: string | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'enum', enum: TransactionType })
  transaction_type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balance_after: number;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
