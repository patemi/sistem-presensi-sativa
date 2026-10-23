import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShiftType {
  PAGI = 'PAGI', // P (pagi): 08:30 - 17:00
  SIANG = 'SIANG', // S (siang): 10:30 - 19:00
  LONG = 'LONG', // LONG (full): 08:30 - 20:00 (closing klinik)
  OFF = 'OFF', // OFF (libur): weekday only, max 4x per bulan
}

export const SHIFT_DETAILS = {
  [ShiftType.PAGI]: {
    code: 'P',
    start: '08:30',
    end: '17:00',
    label: 'Shift Pagi (08:30 - 17:00)',
  },
  [ShiftType.SIANG]: {
    code: 'S',
    start: '10:30',
    end: '19:00',
    label: 'Shift Siang (10:30 - 19:00)',
  },
  [ShiftType.LONG]: {
    code: 'LONG',
    start: '08:30',
    end: '20:00',
    label: 'Long Shift Full (08:30 - 20:00 / Closing)',
  },
  [ShiftType.OFF]: {
    code: 'OFF',
    start: '-',
    end: '-',
    label: 'Libur (OFF)',
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
    nullable: true,
    default: ShiftType.PAGI,
  })
  shift_type: ShiftType;

  @Column({
    name: 'target_check_in',
    type: 'varchar',
    length: 10,
    default: '08:30',
  })
  target_check_in: string; // '08:30'

  @Column({
    name: 'target_check_out',
    type: 'varchar',
    length: 10,
    default: '17:00',
  })
  target_check_out: string; // '17:00'

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
