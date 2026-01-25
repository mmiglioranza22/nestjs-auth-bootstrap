if (process.env.NODE_ENV !== 'test') {
  throw Error('Function only intended to work in testing environment');
}

import {
  AUTHENTICATION_COOKIE,
  CSRF_COOKIE,
  CSRF_CUSTOM_HEADER,
} from 'src/resources/auth/constants';
import { Response, Test } from 'supertest';

// * Can only be invoked in testing environment
// TODO TEST pending
export const withPrivateResourceCredentials = (
  loginResponse: Response,
  client: Test,
): Test => {
  const { accessToken } = getResponseCookies(loginResponse);

  return client.auth(accessToken, { type: 'bearer' });
};

// TODO TEST pending
export const withProtectedResourceCredentials = (
  loginResponse: Response,
  client: Test,
): Test => {
  const { accessToken, csrfToken } = getResponseCookies(loginResponse);

  return client
    .auth(accessToken, { type: 'bearer' })
    .set(CSRF_CUSTOM_HEADER, csrfToken)
    .set('Cookie', [`${CSRF_COOKIE}=${csrfToken}`]);
};

// TODO TEST pending
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
      `${CSRF_COOKIE}=${csrfToken}`,
      `${AUTHENTICATION_COOKIE}=${refreshToken}`,
    ]);
};

// TODO TEST pending
export const getResponseCookies = (
  loginResponse: Response,
): { accessToken: string; csrfToken: string; refreshToken: string } => {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body: { accessToken },
    headers,
  } = loginResponse;

  const csrfToken = (headers['set-cookie'] as unknown as string[])
    .find((cookieString) => cookieString.includes(CSRF_COOKIE))
    ?.split('=')[1]
    .split(';')[0] as string;

  const refreshToken = (headers['set-cookie'] as unknown as string[])
    .find((cookieString) => cookieString.includes(AUTHENTICATION_COOKIE))
    ?.split('=')[1]
    .split(';')[0] as string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return { accessToken, csrfToken, refreshToken };
};
