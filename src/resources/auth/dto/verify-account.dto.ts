import { IsEmail, IsString, MaxLength } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';

export class VerifyAccountDTO {
  @IsString()
  @IsNotEmptyString()
  code: string;

  @IsEmail()
  @MaxLength(40)
  email: string;
}
