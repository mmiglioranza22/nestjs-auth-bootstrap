import { IsEnum } from 'class-validator';
import { UserRole } from '../enum/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDTO {
  @ApiProperty({ type: () => 'UserRole' })
  @IsEnum(UserRole)
  role: UserRole;
}
