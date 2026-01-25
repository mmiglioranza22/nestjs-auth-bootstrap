import { validate } from 'class-validator';
import { CreateRoleDTO } from './create-role.dto';
import { UserRole } from '../enum/user-role.enum';

describe(CreateRoleDTO.name, () => {
  it('should contain role', async () => {
    const roleDto = new CreateRoleDTO();

    const errors = await validate(roleDto);

    const roleError = errors.find((el) => el.property === 'role')?.constraints;

    expect(errors.length).toBe(1);
    expect(roleError).toBeDefined();
    expect(roleError).toEqual({
      isEnum:
        'role must be one of the following values: guest, user, admin, sys_admin',
    });
  });

  it('should validate with valid values ', async () => {
    const roleDto = new CreateRoleDTO();
    roleDto.role = UserRole.GUEST;

    const errors = await validate(roleDto);

    expect(errors.length).toBe(0);
  });
});
