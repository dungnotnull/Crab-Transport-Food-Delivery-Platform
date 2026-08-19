import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trip_id: string;

  @Column('uuid')
  customer_id: string;

  @Column('uuid')
  driver_id: string;

  @Column('int')
  rating: number; // 1 to 5

  @Column('text', { nullable: true })
  feedback: string;

  @CreateDateColumn()
  created_at: Date;
}
