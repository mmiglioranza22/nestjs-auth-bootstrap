import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

export const ROLES_NOT_ALLOWED_FOR_ADMINS = [UserRole.SYS_ADMIN];

export const ROLES_NOT_ALLOWED_FOR_USERS = [
  UserRole.ADMIN,
  UserRole.SYS_ADMIN,
  UserRole.USER,
  UserRole.GUEST,
];

export const ROLES_ALLOWED_FOR_ADMINS = [UserRole.ADMIN, UserRole.USER];
