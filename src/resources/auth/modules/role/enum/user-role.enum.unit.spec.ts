import { UserRole } from './user-role.enum';

describe('UserRole enum', () => {
  it('should contain all expected keys', () => {
    const roles = ['user', 'admin', 'sys_admin', 'guest'];

    expect(Object.keys(UserRole).length).toEqual(roles.length);
  });
});
