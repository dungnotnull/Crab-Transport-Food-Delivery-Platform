import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryColumn('uuid')
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  license_plate: string;

  @Column()
  vehicle_type: string; // BIKE or CAR

  @Column('varchar', { length: 50, nullable: true })
  color: string;

  @Column('decimal', { precision: 3, scale: 2, default: 5.0 })
  average_rating: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
