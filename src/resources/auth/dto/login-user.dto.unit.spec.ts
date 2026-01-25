import { validate } from 'class-validator';
import { LoginUserDTO } from './login-user.dto';
import { LoginSlugDTO } from './login-slug.dto';

describe(LoginUserDTO.name, () => {
  it(`should extend ${LoginSlugDTO.name}`, () => {
    const instance = new LoginUserDTO();

    expect(instance).toBeInstanceOf(LoginSlugDTO);
    expect(instance).toEqual({
      password: undefined,
      slug: undefined,
    });
  });

  it('should contain password', async () => {
    const loginUserDto = new LoginUserDTO();
    loginUserDto.slug = 'test';

    const error = await validate(loginUserDto);
    const passwordError = error.find((el) => el.property === 'password');

    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toEqual({
      isNotEmptyString: 'password should not be an empty string',
      isString: 'password must be a string',
    });
  });

  it('should validate with valid values', async () => {
    const loginUserDto = new LoginUserDTO();
    loginUserDto.slug = 'testuser123';
    loginUserDto.password = 'StrongPass123!';

    const error = await validate(loginUserDto);

    expect(error.length).toBe(0);
    expect(loginUserDto).toEqual({
      slug: 'testuser123',
      password: 'StrongPass123!',
    });
  });
});
