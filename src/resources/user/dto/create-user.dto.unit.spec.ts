import { validate } from 'class-validator';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { CreateUserDTO } from './create-user.dto';
import { SignUpUserDTO } from 'src/resources/auth/dto/signup-user.dto';
import { plainToInstance } from 'class-transformer';

describe(CreateUserDTO.name, () => {
  it(`should extend ${SignUpUserDTO.name}`, () => {
    const instance = new CreateUserDTO();

    expect(instance).toBeInstanceOf(CreateUserDTO);
    expect(instance).toEqual({
      name: undefined,
      username: undefined,
      email: undefined,
      password: undefined,
      roles: undefined,
    });
  });

  it('should accept unique user roles (not repeated)', async () => {
    const createUserDto = new CreateUserDTO();
    createUserDto.roles = [UserRole.ADMIN, UserRole.ADMIN];

    const error = await validate(createUserDto);

    const roleError = error.find((el) => el.property === 'roles')?.constraints;

    expect(roleError).toEqual({
      arrayUnique: "All roles's elements must be unique",
    });
  });

  it('should accept only UserRole values', async () => {
    const createUserDto = plainToInstance(CreateUserDTO, { roles: [1] });

    const error = await validate(createUserDto);

    const roleError = error.find((el) => el.property === 'roles')?.constraints;

    expect(roleError).toBeDefined();
    expect(roleError).toEqual({ isEnum: 'Invalid roles. Check values.' });
  });

  it('should validate with valid values', async () => {
    const createUserDto = new CreateUserDTO();
    createUserDto.name = 'Test User';
    createUserDto.username = 'testuser22';
    createUserDto.email = 'test@user.com';
    createUserDto.password = 'Password1234!';
    createUserDto.roles = [UserRole.ADMIN, UserRole.USER];

    const error = await validate(createUserDto);

    expect(error.length).toBe(0);
    expect(createUserDto).toEqual({
      name: 'Test User',
      username: 'testuser22',
      email: 'test@user.com',
      password: 'Password1234!',
      roles: [UserRole.ADMIN, UserRole.USER],
    });
  });
});
