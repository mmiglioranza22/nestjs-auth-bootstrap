import { PartialType } from '@nestjs/swagger';
import { CreateUserDTO } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';

export class UpdateUserDTO extends PartialType(CreateUserDTO) {
  @IsString()
  @IsNotEmptyString()
  @IsOptional()
  oldPassword?: string;
}
