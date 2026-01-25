import { IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';
import { LoginSlugDTO } from './login-slug.dto';

export class LoginUserDTO extends LoginSlugDTO {
  @IsString()
  @IsNotEmptyString()
  password: string;
}
