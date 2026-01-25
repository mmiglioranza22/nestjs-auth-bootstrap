import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

export const META_ROLES = 'roles';

export const RoleProtected = (...args: UserRole[]) =>
  SetMetadata(META_ROLES, args);
