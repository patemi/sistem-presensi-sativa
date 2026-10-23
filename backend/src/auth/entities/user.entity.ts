import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  STAFF = 'STAFF',
  HR = 'HR',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  password_hash: string;

  @Column({ type: 'varchar', default: UserRole.STAFF })
  role: string; // 'STAFF', 'HR', 'ADMIN' (atau 'karyawan', 'hr', 'owner')

  @Column({ name: 'face_descriptor', type: 'text', nullable: true })
  face_descriptor: string | null;

  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  organization_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
