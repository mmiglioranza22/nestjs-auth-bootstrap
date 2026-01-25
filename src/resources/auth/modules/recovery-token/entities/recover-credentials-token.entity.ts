import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('recovery_token')
export class RecoveryToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  token: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'expires_at' })
  expiresAt: Date;
}
