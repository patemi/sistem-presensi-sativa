import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShiftSwapStatus {
  PENDING = 'PENDING',
  PEER_APPROVED = 'PEER_APPROVED',
  HR_APPROVED = 'HR_APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('shift_swap_requests')
export class ShiftSwapRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_id', type: 'varchar' })
  requester_id: string;

  @Column({ name: 'target_user_id', type: 'varchar' })
  target_user_id: string;

  @Column({ name: 'requester_date', type: 'varchar', length: 20 })
  requester_date: string; // 'YYYY-MM-DD'

  @Column({ name: 'target_date', type: 'varchar', length: 20 })
  target_date: string; // 'YYYY-MM-DD'

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ShiftSwapStatus.PENDING,
  })
  status: ShiftSwapStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
