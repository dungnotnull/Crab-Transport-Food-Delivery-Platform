import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: DiscountType })
  discount_type: DiscountType;

  @Column('decimal', { precision: 10, scale: 2 })
  discount_value: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  min_trip_value: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  max_discount: number | null;

  @Column('int')
  usage_limit: number;

  @Column('int', { default: 0 })
  used_count: number;

  @Column('timestamp')
  valid_from: Date;

  @Column('timestamp')
  valid_until: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
