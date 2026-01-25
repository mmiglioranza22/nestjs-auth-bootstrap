import { validate } from 'class-validator';
import { UserPasswordDTO } from './user-password.dto';
import { ResetPasswordDTO } from './reset-password.dto';

describe(UserPasswordDTO.name, () => {
  it('should allow strong password creation (check criteria)', async () => {
    const password = new ResetPasswordDTO();
    // sanity check due to abstract class
    expect(password).toBeInstanceOf(UserPasswordDTO);
    expect(password).toEqual({
      password: undefined,
    });

    password.password = 'A-really-strong-password-123!';

    const error = await validate(password);

    const passwordError = error.find((el) => el.property === 'password');

    expect(passwordError).toBeUndefined();
  });

  it('should not allow unsafe combinations', async () => {
    const notLongEnough = new ResetPasswordDTO();
    const noLowercase = new ResetPasswordDTO();
    const noUppercase = new ResetPasswordDTO();
    const noNumbers = new ResetPasswordDTO();
    const noSymbols = new ResetPasswordDTO();

    notLongEnough.password = 'Hakm3now_';
    noLowercase.password = 'HACKM3NOW_';
    noUppercase.password = 'hackm3now_';
    noNumbers.password = 'Hackmenow_';
    noSymbols.password = 'Hackm3noww';

    const errors = await Promise.all([
      validate(notLongEnough),
      validate(noLowercase),
      validate(noUppercase),
      validate(noNumbers),
      validate(noSymbols),
    ]);

    const passwordErrors = errors
      .map((error) => error.find((el) => el.property === 'password'))
      .filter((el) => el !== undefined); // sanity check for correct list length

    expect(passwordErrors.length).toBe(5);
    passwordErrors.forEach((error) => {
      expect(error?.constraints).toEqual({
        isStrongPassword:
          'The password must have an uppercase letter, a lowercase letter, a number, a symbol and be 10 characters long',
      });
    });
  });
});
