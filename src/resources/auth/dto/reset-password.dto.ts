import { IsString } from 'class-validator';
import { UserPasswordDTO } from './user-password.dto';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';

export class ResetPasswordDTO extends UserPasswordDTO {
  @IsString()
  @IsNotEmptyString()
  recoveryToken: string;
}
