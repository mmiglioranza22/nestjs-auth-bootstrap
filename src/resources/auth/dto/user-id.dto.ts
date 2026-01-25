import { IsUUID } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/is-not-empty-string/is-not-empty-string.decorator';

export class UserIdDTO {
  @IsUUID()
  @IsNotEmptyString()
  userId: string;
}
