import { IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';

export class LoginSlugDTO {
  @IsString()
  @IsNotEmptyString()
  slug: string;
}
