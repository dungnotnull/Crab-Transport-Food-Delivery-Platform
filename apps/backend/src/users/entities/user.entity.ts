import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';

export enum Role {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password?: string; // Optional because we might add OAuth later, and usually we exclude it from responses

  @Column({ default: 'Unknown' })
  full_name: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string | null;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CUSTOMER,
  })
  role: Role;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => DriverProfile, profile => profile.user)
  driverProfile: DriverProfile;
}
