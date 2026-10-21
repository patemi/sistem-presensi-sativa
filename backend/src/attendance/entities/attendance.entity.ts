import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  date: string; // 'YYYY-MM-DD'

  @Column({ name: 'check_in_time', type: 'datetime', nullable: true })
  check_in_time: Date | null;

  @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
  check_out_time: Date | null;

  @Column({ name: 'overtime_minutes', type: 'int', default: 0 })
  overtime_minutes: number;

  @Column({ name: 'mental_health_log', type: 'text', nullable: true })
  mental_health_log: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
