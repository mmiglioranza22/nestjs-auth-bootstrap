/* eslint-disable @typescript-eslint/no-unsafe-assignment */
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'ci') {
  throw Error(
    'Function only intended to work in testing and CI/CD environment',
  );
}

import {
  AUTHENTICATION_COOKIE_HEADER,
  CSRF_COOKIE_HEADER,
  CSRF_CUSTOM_HEADER,
} from 'src/resources/auth/constants';
import { Response, Test } from 'supertest';

export const withPrivateResourceCredentials = (
  loginResponse: Response,
  client: Test,
): Test => {
  const { accessToken } = getResponseCookies(loginResponse);

  return client.auth(accessToken, { type: 'bearer' });
};

export const withProtectedResourceCredentials = (
  loginResponse: Response,
  client: Test,
): Test => {
  const { accessToken, csrfToken } = getResponseCookies(loginResponse);

  return client
    .auth(accessToken, { type: 'bearer' })
    .set(CSRF_CUSTOM_HEADER, csrfToken)
    .set('Cookie', [`${CSRF_COOKIE_HEADER}=${csrfToken}`]);
};

export const withAllCredentials = (
  loginResponse: Response,
  client: Test,
): Test => {
  const { accessToken, refreshToken, csrfToken } =
    getResponseCookies(loginResponse);

  return client
    .auth(accessToken, { type: 'bearer' })
    .set(CSRF_CUSTOM_HEADER, csrfToken)
    .set('Cookie', [
      `${CSRF_COOKIE_HEADER}=${csrfToken}`,
      `${AUTHENTICATION_COOKIE_HEADER}=${refreshToken}`,
    ]);
};

export const getResponseCookies = (
  loginResponse: Response,
): { accessToken: string; csrfToken: string; refreshToken: string } => {
  const {
    body: { accessToken },
    headers,
  } = loginResponse;

  const csrfToken = (headers['set-cookie'] as unknown as string[])
    .find((cookieString) => cookieString.includes(CSRF_COOKIE_HEADER))
    ?.split('=')[1]
    .split(';')[0] as string;

  const refreshToken = (headers['set-cookie'] as unknown as string[])
    .find((cookieString) => cookieString.includes(AUTHENTICATION_COOKIE_HEADER))
    ?.split('=')[1]
    .split(';')[0] as string;

  return { accessToken, csrfToken, refreshToken };
};
