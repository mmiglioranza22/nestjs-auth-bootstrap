import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { type SignedCookies } from 'src/resources/auth/interfaces/signed-cookies.interface';
import { INVALID_MISSING_COOKIES } from 'src/common/constants/error-messages';

export const cookies = (
  data: string | undefined,
  ctx: ExecutionContext,
): SignedCookies | Record<string, any> | null => {
  const request = ctx.switchToHttp().getRequest<Request>();

  const cookies = request.cookies;
  const signedCookies = request.signedCookies as SignedCookies;

  // Generic check (Whenever cookies are required, throw if they are not present)
  if (
    (data === 'signed' && !signedCookies) ||
    (data !== 'signed' && !cookies)
  ) {
    throw new BadRequestException(INVALID_MISSING_COOKIES);
  }

  if (data === 'signed') {
    return signedCookies;
  }

  if (data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cookies[data] ?? null;
  }
  return cookies;
};

export const Cookies = createParamDecorator(cookies);
