import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { META_ROLES } from 'src/resources/auth/decorators/role-protected/role-protected.decorator';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import {
  ROLE_GUARD_FORBIDDEN,
  ROLE_GUARD_UNAUTHORIZED_USER,
} from 'src/common/constants/error-messages';
import { CacheService } from 'src/infra/cache/cache.service';
import { type UserAuthInfo } from '../../interfaces/user-auth-info.interface';

// * This guard is intended to be used only for role checking **required** specific roles. (Authentication)
// * Not passing any roles or being those roles inexistent will deny access.
// * Must be used SetMetadata/RoleProtected guard
@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const validRoles: UserRole[] = this.reflector.get(
      META_ROLES,
      context.getHandler(),
    );

    // ? Correct implementation checks (redundancy)
    // * do not allow access if property does not exist: @RoleProtected was not used
    if (!validRoles) {
      return false;
    }

    // * do not allow access if property does not contain any value: @RoleProtected was not used with valid values
    if (validRoles.length === 0) {
      return false;
    }

    const req = context.switchToHttp().getRequest<Request>(); // * This is the reason why guard must be used with Private(). req.user is added by passport strategy
    const agentId = req.user as string; // ? jwt strategy validate

    const user = await this.cacheService.getValue(agentId);

    // * user should always be present: @Private decorator was not used (controller or route handler)
    if (!user) {
      throw new UnauthorizedException(ROLE_GUARD_UNAUTHORIZED_USER);
    }

    // ? Actual guard check
    // * Roles could be checked in a redis store (saved at the moment of login), to avoid sending them with the request or checking the DB on each invocation
    let isValidAgent = false;

    for (const role of user.roles) {
      if (validRoles.includes(role)) {
        isValidAgent = true;
      }
    }
    if (isValidAgent) {
      req.user = this.attachRequestAgent(user);
      return true;
    }

    throw new ForbiddenException(ROLE_GUARD_FORBIDDEN);
  }

  private attachRequestAgent = (user: UserAuthInfo): RequestAgent => {
    return {
      id: user.userId,
      active: user.active,
      roles: user.roles,
    };
  };
}
