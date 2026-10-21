import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShiftType {
  PAGI = 'PAGI', // 08:30 - 17:00
  SIANG = 'SIANG', // 10:30 - 19:00
}

export const SHIFT_DETAILS = {
  [ShiftType.PAGI]: {
    start: '08:30',
    end: '17:00',
    label: 'Shift Pagi (08:30 - 17:00)',
  },
  [ShiftType.SIANG]: {
    start: '10:30',
    end: '19:00',
    label: 'Shift Siang (10:30 - 19:00)',
  },
};

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  date: string; // 'YYYY-MM-DD'

  @Column({
    name: 'shift_type',
    type: 'varchar',
    length: 20,
    default: ShiftType.PAGI,
  })
  shift_type: ShiftType;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
