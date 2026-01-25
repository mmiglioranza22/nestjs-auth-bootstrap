// https://docs.nestjs.com/security/authentication
// https://docs.nestjs.com/recipes/passport

import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { AuthorizedRoles } from '../authorized-roles/authorized-roles.decorator';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { CsrfGuard } from 'src/resources/auth/guards/csrf/csrf.guard';

// * UserRole.GUEST is rejected.
// * All routes are csrf checked (ideal for API access eventually)
export const Protected = () => {
  return applyDecorators(
    UseGuards(CsrfGuard),
    AuthorizedRoles(UserRole.USER, UserRole.ADMIN, UserRole.SYS_ADMIN),
  );
};
