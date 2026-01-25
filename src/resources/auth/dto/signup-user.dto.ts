import {
  IsAlphanumeric,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserPasswordDTO } from './user-password.dto';

export class SignUpUserDTO extends UserPasswordDTO {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  @Matches(/^[a-zA-Z\s]+$/g, {
    message: 'name must contain only letters',
  })
  name: string;

  @IsString()
  @MinLength(4)
  @MaxLength(40)
  @IsAlphanumeric()
  username: string;

  @IsEmail()
  @MaxLength(40)
  email: string;
}
