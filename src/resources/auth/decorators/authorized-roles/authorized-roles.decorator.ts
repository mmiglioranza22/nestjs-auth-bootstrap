// https://docs.nestjs.com/security/authentication
// https://docs.nestjs.com/recipes/passport

import { applyDecorators, UseGuards } from '@nestjs/common';
import { RoleProtected } from '../role-protected/role-protected.decorator';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { UserRoleGuard } from 'src/resources/auth/guards/user-roles/user-role.guard';

// * Used for specific per role authorization
// Authentication is assumed (mainly in controller or specific route handler -> @Private()) (user extracted from request)
export const AuthorizedRoles = (...args: UserRole[]) => {
  return applyDecorators(RoleProtected(...args), UseGuards(UserRoleGuard));
};
