import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Point } from 'geojson';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  FINDING_DRIVER = 'FINDING_DRIVER',
  ACCEPTED = 'ACCEPTED',
  ARRIVED_AT_PICKUP = 'ARRIVED_AT_PICKUP',
  ARRIVED_AT_RESTAURANT = 'ARRIVED_AT_RESTAURANT',
  WAITING_FOR_FOOD = 'WAITING_FOR_FOOD',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_AT_DESTINATION = 'ARRIVED_AT_DESTINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customer_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column('uuid', { nullable: true })
  driver_id: string;

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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total_fare: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
