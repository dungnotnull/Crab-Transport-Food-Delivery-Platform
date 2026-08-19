import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn, Index, UpdateDateColumn } from 'typeorm';
import type { Point } from 'geojson';
import { User } from '../../users/entities/user.entity';

@Entity('driver_locations')
export class DriverLocation {
  @PrimaryColumn('uuid')
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  current_location: Point;

  @Column({ default: false })
  is_online: boolean;

  @Column('uuid', { nullable: true })
  active_order_id: string | null;

  @UpdateDateColumn()
  last_updated: Date;
}
