import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { INVALID_USER_FALLBACK } from 'src/common/constants/error-messages';
import { User } from 'src/resources/user/entities/user.entity';

type UserKeys = keyof Pick<User, 'id' | 'active' | 'roles'>;

export const getUser = (data: UserKeys | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const user = req.user as RequestAgent; // available thanks to JwtStrategy (validate) and UserRoleGuard (attachRequestAgent)

  // * Fallback. Should never happen since decorators is used in protected routes and JwtStrategy signs user in every request
  if (!user) {
    throw new UnauthorizedException(INVALID_USER_FALLBACK);
  }
  // Role, active or id only
  if (data) {
    return user[data];
  }

  return user;
};

export const GetUser = createParamDecorator(getUser);
