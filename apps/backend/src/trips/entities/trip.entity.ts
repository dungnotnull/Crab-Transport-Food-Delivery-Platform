import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Point } from 'geojson';
import { User } from '../../users/entities/user.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export enum OrderStatus {
  FINDING_DRIVER = 'FINDING_DRIVER',
  ACCEPTED = 'ACCEPTED',
  DRIVER_ARRIVING = 'DRIVER_ARRIVING',
  ARRIVED_AT_PICKUP = 'ARRIVED_AT_PICKUP',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_AT_DESTINATION = 'ARRIVED_AT_DESTINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  E_WALLET = 'E_WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customer_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column('uuid', { nullable: true })
  driver_id: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  pickup_location: Point;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  dropoff_location: Point;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.FINDING_DRIVER,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: VehicleType,
    default: VehicleType.BIKE,
  })
  vehicle_type: VehicleType;

  @Column('decimal', { precision: 10, scale: 2 })
  original_fare: number;

  @Column({ type: 'varchar', nullable: true })
  coupon_code: string | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  platform_fee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  driver_revenue: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total_fare: number; // customer_paid

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column('int', { default: 0 })
  estimated_duration: number; // in minutes

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
