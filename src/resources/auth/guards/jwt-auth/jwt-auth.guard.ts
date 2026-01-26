// https://docs.nestjs.com/recipes/passport#extending-guards
// https://stackoverflow.com/questions/60042350/customise-the-response-on-verification-failure-for-a-jwt-strategy-nestjs
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import {
  EXPIRED_ACCESS_TOKEN,
  TAMPERED_ACCESS_TOKEN,
} from 'src/common/constants/error-messages';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context); // * goes to jwt strategy validate method
  }

  // * Note on errors:
  // Access token errors are handled here (any access token error gets handled directly by handleRequest, without triggering validate method in strategy)
  // error is mapped to a different prop (error or info) in handleRequest depending on which token throws the error
  handleRequest<TUser = string>(
    err: any,
    user: string,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    if (info instanceof TokenExpiredError) {
      throw new TokenExpiredError(EXPIRED_ACCESS_TOKEN, info.expiredAt);
    }

    if (info instanceof JsonWebTokenError) {
      for (const cookie in request.signedCookies) {
        response.clearCookie(cookie);
      }
      // send event to monitoring with request timestamp, ip and userid
      throw new UnauthorizedException(TAMPERED_ACCESS_TOKEN);
    }

    // * any other error, let it bubble up
    if (err || !user) {
      return super.handleRequest(err, user, info, context, status);
    }

    return user as TUser;
  }
}
