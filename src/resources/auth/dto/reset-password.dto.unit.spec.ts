import { validate } from 'class-validator';
import { ResetPasswordDTO } from './reset-password.dto';
import { UserPasswordDTO } from './user-password.dto';

describe(ResetPasswordDTO.name, () => {
  it(`should extend ${UserPasswordDTO.name}`, () => {
    const instance = new ResetPasswordDTO();

    expect(instance).toBeInstanceOf(UserPasswordDTO);
    expect(instance).toEqual({
      password: undefined,
      recoveryToken: undefined,
    });
  });

  it('should contain recovery token', async () => {
    const resetPassDto = new ResetPasswordDTO();
    resetPassDto.password = 'Password1234!';

    const error = await validate(resetPassDto);

    const tokenError = error.find((el) => el.property === 'recoveryToken');

    expect(tokenError).toBeDefined();
    expect(tokenError?.constraints).toEqual({
      isNotEmptyString: 'recoveryToken should not be an empty string',
      isString: 'recoveryToken must be a string',
    });
  });

  it('should validate with valid values', async () => {
    const resetPasswordDto = new ResetPasswordDTO();
    resetPasswordDto.password = 'SomePassword123!';
    resetPasswordDto.recoveryToken = 'some-recovery-token';

    const error = await validate(resetPasswordDto);

    expect(error.length).toBe(0);
    expect(resetPasswordDto).toEqual({
      password: 'SomePassword123!',
      recoveryToken: 'some-recovery-token',
    });
  });
});
