import { applyDecorators, UseGuards } from '@nestjs/common';
import { CsrfGuard } from 'src/resources/auth/guards/csrf/csrf.guard';

// * Used for csrf token check set by /login and /revalidate-credentials in auth controller
export const CsrfCheck = () => {
  return applyDecorators(UseGuards(CsrfGuard));
};
