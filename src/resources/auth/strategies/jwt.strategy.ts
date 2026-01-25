// https://docs.nestjs.com/recipes/passport#implementing-passport-jwt
// * use JWT for authentication only https://stackoverflow.com/questions/47224931/is-setting-roles-in-jwt-a-best-practice
// this way roles can be changed on the fly without waiting for token to expire or changing it manually on each role change
// Redis cache for token and user check: https://docs.nestjs.com/techniques/caching
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { type JwtPayload } from '../interfaces/jwt-payload.interface';
import { type EnvVariables } from 'config/env-variables';

// * JWT strategy only refers to **access token** logic (authentication for protected resources)
// Authorization is handled by UserRoleGuard (which checks refresh token in cache for invalidation before refresh token expiry)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService<EnvVariables>) {
    super({
      secretOrKey: configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    });
  }

  validate({ sub: id }: JwtPayload): string | undefined {
    return id;
  }
}
