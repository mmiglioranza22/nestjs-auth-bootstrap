import { validate } from 'class-validator';
import { VerifyAccountDTO } from './verify-account.dto';
describe(VerifyAccountDTO.name, () => {
  it('should contain token', async () => {
    const verifyAccountDto = new VerifyAccountDTO();

    const errors = await validate(verifyAccountDto);
    const codeError = errors.find((el) => el.property === 'code');

    const emailError = errors.find((el) => el.property === 'email');

    expect(codeError).toBeDefined();
    expect(emailError).toBeDefined();
    expect(codeError?.constraints).toEqual({
      isNotEmptyString: 'code should not be an empty string',
      isString: 'code must be a string',
    });
    expect(emailError?.constraints).toEqual({
      isEmail: 'email must be an email',
      maxLength: 'email must be shorter than or equal to 40 characters',
    });
  });

  it('should validate with valid values (any string)', async () => {
    const verifyAccountDto = new VerifyAccountDTO();
    verifyAccountDto.code = '123456';
    verifyAccountDto.email = 'mail@test.com';

    const error = await validate(verifyAccountDto);

    expect(error.length).toBe(0);
    expect(verifyAccountDto).toEqual({
      code: '123456',
      email: 'mail@test.com',
    });
  });
});
