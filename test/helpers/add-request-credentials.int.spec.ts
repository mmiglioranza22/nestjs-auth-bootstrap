/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createMock } from '@golevelup/ts-vitest';
import {
  getResponseCookies,
  withAllCredentials,
  withPrivateResourceCredentials,
  withProtectedResourceCredentials,
} from './add-request-credentials';
import supertest, { Response } from 'supertest';
import {
  AUTH_COOKIE_PATH,
  AUTHENTICATION_COOKIE_HEADER,
  CSRF_COOKIE_HEADER,
  CSRF_COOKIE_PATH,
  CSRF_CUSTOM_HEADER,
} from 'src/resources/auth/constants';
import TestAgent from 'supertest/lib/agent';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { Containers, TestContainersSetup } from './testcontainers.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import cookieParser from 'cookie-parser';

// * Testcontainers are required since we are testing the functions with the actual apiClient object (not mocked)
describe('Check request utils', () => {
  let app: INestApplication<App>;
  let apiClient: TestAgent;
  let containers: Containers;

  const mockAccessToken = 'some-jwt-token';
  const mockRefreshToken = 'i-am-the-refresh-token';
  const mockCsrfToken = 'super-secret-token';
  const setCookieHeaders = [
    `${AUTHENTICATION_COOKIE_HEADER}=${mockRefreshToken}; Max-Age=999; Path=${AUTH_COOKIE_PATH}; Expires=Mon, 26 Jan 2026 12:58:11 GMT; HttpOnly; Secure; SameSite=Strict`,
    `${CSRF_COOKIE_HEADER}=${mockCsrfToken}; Max-Age=999; Path=${CSRF_COOKIE_PATH}; Expires=Mon, 26 Jan 2026 12:58:11 GMT; Secure; SameSite=Strict`,
  ];

  const mockHeaders = {
    ['set-cookie']: setCookieHeaders,
  };

  beforeAll(async () => {
    // * Note: using DEBUG makes tests runner run later apparently and no need for timeout
    containers = await TestContainersSetup.setup(2000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bufferLogs: true,
      rawBody: true,
    });
    app.setGlobalPrefix('api');

    app.use(
      cookieParser(
        'SECRET_STRING_FOR_TESTING_COOKIES_REMOVE_WHEN_PUSHING_DEFINITIVE_VERSION_OR_YOU_WILL_BE_FIRED!!!',
        {},
      ),
    );

    await app.init();

    apiClient = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await containers.stopAllContainers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe(getResponseCookies.name, () => {
    it('should extract and return tokens', () => {
      const mockResponse = createMock<Response>({
        body: {
          accessToken: mockAccessToken,
        },
        headers: mockHeaders as unknown as any,
      });

      const { accessToken, csrfToken, refreshToken } =
        getResponseCookies(mockResponse);

      expect(mockAccessToken).toBe(accessToken);
      expect(mockRefreshToken).toBe(refreshToken);
      expect(mockCsrfToken).toBe(csrfToken);
    });
  });

  describe(withPrivateResourceCredentials.name, () => {
    it('should set bearer token', async () => {
      const mockResponse = createMock<Response>({
        body: {
          accessToken: mockAccessToken,
        },
        headers: mockHeaders as unknown as any,
      });

      const test = apiClient.get('/api/seed'); // doesnt matter, we only want to check if the request props are set

      await withPrivateResourceCredentials(mockResponse, test).expect(
        (response) => {
          expect(response.request.getHeader('Authorization')).toBe(
            `Bearer ${mockAccessToken}`,
          );
        },
      );
    });
  });

  describe(withProtectedResourceCredentials.name, () => {
    it('should set bearer token, custom csrf header and csrf cookie', async () => {
      const mockResponse = createMock<Response>({
        body: {
          accessToken: mockAccessToken,
        },
        headers: mockHeaders as unknown as any,
      });

      const test = apiClient.get('/api/seed'); // doesnt matter, we only want to check if the request props are set

      await withProtectedResourceCredentials(mockResponse, test).expect(
        (response) => {
          expect(response.request.getHeader('Authorization')).toBe(
            `Bearer ${mockAccessToken}`,
          );
          expect(response.request.getHeader(CSRF_CUSTOM_HEADER)).toBe(
            mockCsrfToken,
          );
          expect(response.request.getHeader('Cookie')[0]).toBe(
            `${CSRF_COOKIE_HEADER}=${mockCsrfToken}`,
          );
        },
      );
    });
  });

  describe(withAllCredentials.name, () => {
    it('should set bearer token, custom csrf header, csrf cookie and authentication cookie', async () => {
      const mockResponse = createMock<Response>({
        body: {
          accessToken: mockAccessToken,
        },
        headers: mockHeaders as unknown as any,
      });

      const test = apiClient.get('/api/login'); // only /login and /revalidate-credentials are the routes the Authorization cookie is sent, although for this test it does not matter

      await withAllCredentials(mockResponse, test).expect((response) => {
        expect(response.request.getHeader('Authorization')).toBe(
          `Bearer ${mockAccessToken}`,
        );
        expect(response.request.getHeader(CSRF_CUSTOM_HEADER)).toBe(
          mockCsrfToken,
        );
        // Order follows same order for cookies passed in function
        expect(response.request.getHeader('Cookie')[0]).toBe(
          `${CSRF_COOKIE_HEADER}=${mockCsrfToken}`,
        );
        expect(response.request.getHeader('Cookie')[1]).toBe(
          `${AUTHENTICATION_COOKIE_HEADER}=${mockRefreshToken}`,
        );
      });
    });
  });
});
