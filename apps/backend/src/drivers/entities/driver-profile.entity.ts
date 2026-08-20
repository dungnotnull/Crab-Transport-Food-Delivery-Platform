import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryColumn('uuid')
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  license_plate: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    default: VehicleType.BIKE,
  })
  vehicle_type: VehicleType;

  @Column('varchar', { length: 50, nullable: true })
  color: string;

  @Column('varchar', { length: 100, nullable: true })
  vehicle_brand: string;

  @Column('text', { nullable: true })
  vehicle_image: string;

  @Column('decimal', { precision: 3, scale: 2, default: 5.0 })
  average_rating: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
