import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

interface Role {
  role: UserRole;
}

interface User {
  name: string;
  username: string;
  email: string;
  password: string;
  roles?: UserRole[];
}

interface Seed {
  role: Role[];
  user: User[];
  sysadmin: User;
}

export const seed: Seed = {
  sysadmin: {
    name: 'sys-admin',
    username: 'test-sys-admin',
    email: 'sys-admin@test.com',
    password: 'Password123!',
  },
  user: [
    {
      name: 'Test user',
      username: 'test_user',
      email: 'user@test.com',
      password: 'Password123!',
      roles: [UserRole.USER],
    },
    {
      name: 'Test admin user',
      username: 'test_admin_user',
      email: 'admin@test.com',
      password: 'Password123!',
      roles: [UserRole.ADMIN],
    },
    {
      name: 'guest user',
      username: 'guest_user',
      email: 'guest@test.com',
      password: 'Password123!',
      roles: [UserRole.GUEST],
    },
  ],
  role: [
    {
      role: UserRole.SYS_ADMIN,
    },
    {
      role: UserRole.USER,
    },
    {
      role: UserRole.ADMIN,
    },
    {
      role: UserRole.GUEST,
    },
  ],
};
