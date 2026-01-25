import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsEnum, IsOptional } from 'class-validator';
import { SignUpUserDTO } from 'src/resources/auth/dto/signup-user.dto';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

export class CreateUserDTO extends SignUpUserDTO {
  @ApiProperty({
    isArray: true,
    enum: UserRole,
    description: 'UserRole[]',
  })
  @IsEnum(UserRole, {
    each: true,
    message: 'Invalid roles. Check values.',
  })
  @ArrayUnique()
  @IsOptional()
  roles?: UserRole[];
}
