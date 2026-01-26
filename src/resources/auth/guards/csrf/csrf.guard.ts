import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import {
  CSRF_COOKIE_HEADER,
  CSRF_CUSTOM_HEADER,
} from 'src/resources/auth/constants';
import { CsrfTokenService } from 'src/resources/auth/modules/csrf-token/csrf-token.service';
import {
  CSRF_TOKEN_INVALID,
  CSRF_TOKEN_MISMATCH,
  CSRF_TOKEN_MISSING,
} from 'src/common/constants/error-messages';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfTokenService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = (request.cookies?.[CSRF_COOKIE_HEADER] as string) ?? '';
    const headerToken = request.headers[`${CSRF_CUSTOM_HEADER}`];

    if (!cookieToken || !headerToken) {
      throw new UnauthorizedException(CSRF_TOKEN_MISSING);
    }

    if (cookieToken !== headerToken) {
      throw new UnauthorizedException(CSRF_TOKEN_MISMATCH);
    }

    if (!this.csrfService.verifyCsrfToken(cookieToken)) {
      throw new UnauthorizedException(CSRF_TOKEN_INVALID);
    }

    return true;
  }
}
