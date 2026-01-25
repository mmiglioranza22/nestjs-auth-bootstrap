import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../enum/user-role.enum';

@Entity()
export class Role {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @ApiProperty({
    enum: UserRole,
    description: 'UserRole',
  })
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;
}
