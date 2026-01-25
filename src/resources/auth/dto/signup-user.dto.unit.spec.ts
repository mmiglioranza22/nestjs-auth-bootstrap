import { validate } from 'class-validator';
import { SignUpUserDTO } from './signup-user.dto';
import { UserPasswordDTO } from './user-password.dto';

describe(SignUpUserDTO.name, () => {
  it(`should extend ${UserPasswordDTO.name}`, () => {
    const instance = new SignUpUserDTO();

    expect(instance).toBeInstanceOf(UserPasswordDTO);
    expect(instance).toEqual({
      name: undefined,
      username: undefined,
      email: undefined,
      password: undefined,
    });
  });

  it('should validate name property with its requirements', async () => {
    const shortNameDto = new SignUpUserDTO();
    const longNameDto = new SignUpUserDTO();
    const onlyLettersDto = new SignUpUserDTO();

    shortNameDto.name = 'Liu';
    longNameDto.name =
      'An extremely long name thought to exceed the forty characters limit';
    onlyLettersDto.name = 'An Inv4alid Nam3';

    const errors = await Promise.all([
      validate(shortNameDto),
      validate(longNameDto),
      validate(onlyLettersDto),
    ]);

    const [shortNameError, longNameError, onlyLettersError] = errors.map(
      (error) => error.find((el) => el.property === 'name'),
    );

    [shortNameError, longNameError, onlyLettersError].forEach((error) =>
      expect(error).toBeDefined(),
    );
    expect(shortNameError?.constraints).toEqual({
      minLength: 'name must be longer than or equal to 4 characters',
    });
    expect(longNameError?.constraints).toEqual({
      maxLength: 'name must be shorter than or equal to 40 characters',
    });
    expect(onlyLettersError?.constraints).toEqual({
      matches: 'name must contain only letters',
    });
  });

  it('should validate username property with its requirements', async () => {
    const shortUsernameDto = new SignUpUserDTO();
    const longUsernameDto = new SignUpUserDTO();
    const alphanumericUsernameDto = new SignUpUserDTO();

    shortUsernameDto.username = 'l1u';
    longUsernameDto.username =
      'Anextr3melylongnamethoughttoexc33dthefortycharactersl1m1t';
    alphanumericUsernameDto.username = 'Invalid username';

    const errors = await Promise.all([
      validate(shortUsernameDto),
      validate(longUsernameDto),
      validate(alphanumericUsernameDto),
    ]);

    const [shortUsernameError, longUsernameError, alphanumericError] =
      errors.map((error) => error.find((el) => el.property === 'username'));

    [shortUsernameError, longUsernameError, alphanumericError].forEach(
      (error) => expect(error).toBeDefined(),
    );
    expect(shortUsernameError?.constraints).toEqual({
      minLength: 'username must be longer than or equal to 4 characters',
    });
    expect(longUsernameError?.constraints).toEqual({
      maxLength: 'username must be shorter than or equal to 40 characters',
    });

    expect(alphanumericError?.constraints).toEqual({
      isAlphanumeric: 'username must contain only letters and numbers',
    });
  });

  it('should validate email property with its requirements', async () => {
    const invalidEmailDto = new SignUpUserDTO();
    const longEmailDto = new SignUpUserDTO();

    invalidEmailDto.email = '@email.com';
    longEmailDto.email =
      'superlonglonglonglonglonglonglonglong@somelongemailprovider.com';

    const errors = await Promise.all([
      validate(invalidEmailDto),
      validate(longEmailDto),
    ]);

    const [invalidEmailError, longEmailError] = errors.map((error) =>
      error.find((el) => el.property === 'email'),
    );

    [invalidEmailError, longEmailError].forEach((error) =>
      expect(error).toBeDefined(),
    );
    expect(invalidEmailError?.constraints).toEqual({
      isEmail: 'email must be an email',
    });
    expect(longEmailError?.constraints).toEqual({
      maxLength: 'email must be shorter than or equal to 40 characters',
    });
  });

  it('should create a valid signup user dto ', async () => {
    const sigupUserDto = new SignUpUserDTO();

    sigupUserDto.name = 'Test User';
    sigupUserDto.username = 'testuser1';
    sigupUserDto.email = 'test-user@mail.com';
    sigupUserDto.password = 'SafePassword123!'; // tested by UserPasswordDTO

    const validSignupUser = await validate(sigupUserDto);

    expect(validSignupUser.length).toBe(0);
  });
});
