import { IsStrongPassword } from 'class-validator';

export abstract class UserPasswordDTO {
  @IsStrongPassword(
    {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'The password must have an uppercase letter, a lowercase letter, a number, a symbol and be 10 characters long',
    },
  )
  password: string;
}
