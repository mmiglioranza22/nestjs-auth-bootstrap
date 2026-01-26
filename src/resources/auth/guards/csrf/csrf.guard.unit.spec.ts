import { createMock } from '@golevelup/ts-vitest';
import { CsrfGuard } from './csrf.guard';
import { CsrfTokenService } from '../../modules/csrf-token/csrf-token.service';
import { Request } from 'express';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CSRF_COOKIE_HEADER, CSRF_CUSTOM_HEADER } from '../../constants';
import {
  CSRF_TOKEN_INVALID,
  CSRF_TOKEN_MISMATCH,
  CSRF_TOKEN_MISSING,
} from 'src/common/constants/error-messages';

describe(CsrfGuard.name, () => {
  let guard: CsrfGuard;
  let mockCsrfTokenService: CsrfTokenService;

  beforeEach(() => {
    mockCsrfTokenService = createMock<CsrfTokenService>({
      verifyCsrfToken: vi.fn(),
    });
    guard = new CsrfGuard(mockCsrfTokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass if cookie and header token sent are valid', () => {
    vi.spyOn(mockCsrfTokenService, 'verifyCsrfToken').mockReturnValue(true);
    const sameToken = 'token';
    const mockRequest = createMock<Request>({
      headers: {
        [`${CSRF_CUSTOM_HEADER}`]: sameToken,
      },
      cookies: {
        [`${CSRF_COOKIE_HEADER}`]: sameToken,
      },
    });

    const mockExecutionContextValid = createMock<ExecutionContext>({
      switchToHttp: vi.fn().mockImplementation(() => ({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      })),
    });

    const result = guard.canActivate(mockExecutionContextValid);

    expect(result).toBe(true);
  });

  it('should throw if either cookie token or header is missing', async () => {
    const csrfToken = 'csrf-token';
    const mockResquestWithoutCookies = createMock<Request>({
      headers: {
        [`${CSRF_CUSTOM_HEADER}`]: csrfToken,
      },
      cookies: {},
    });
    const mockResquestWithoutHeaders = createMock<Request>({
      cookies: {
        [`${CSRF_COOKIE_HEADER}`]: csrfToken,
      },
      headers: {},
    });

    const mockExecutionContextWithoutCookies = createMock<ExecutionContext>({
      switchToHttp: vi.fn().mockImplementation(() => ({
        getRequest: vi.fn().mockReturnValue(mockResquestWithoutCookies),
      })),
    });
    const mockExecutionContextWithoutHeaders = createMock<ExecutionContext>({
      switchToHttp: vi.fn().mockImplementation(() => ({
        getRequest: vi.fn().mockReturnValue(mockResquestWithoutHeaders),
      })),
    });

    await expect(
      async () => await guard.canActivate(mockExecutionContextWithoutCookies),
    ).rejects.toThrowWithMessage(UnauthorizedException, CSRF_TOKEN_MISSING);

    await expect(
      async () => await guard.canActivate(mockExecutionContextWithoutHeaders),
    ).rejects.toThrowWithMessage(UnauthorizedException, CSRF_TOKEN_MISSING);
  });

  it('should throw if cookie token and header token do not match', async () => {
    const mockRequest = createMock<Request>({
      headers: {
        [`${CSRF_CUSTOM_HEADER}`]: 'token1',
      },
      cookies: {
        [`${CSRF_COOKIE_HEADER}`]: 'token2',
      },
    });

    const mockExecutionContextMismatch = createMock<ExecutionContext>({
      switchToHttp: vi.fn().mockImplementation(() => ({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      })),
    });

    await expect(
      async () => await guard.canActivate(mockExecutionContextMismatch),
    ).rejects.toThrowWithMessage(UnauthorizedException, CSRF_TOKEN_MISMATCH);
  });

  it('should throw if either cookie token is invalid (tampered)', async () => {
    vi.spyOn(mockCsrfTokenService, 'verifyCsrfToken').mockReturnValue(false);
    const sameToken = 'token';
    const mockRequest = createMock<Request>({
      headers: {
        [`${CSRF_CUSTOM_HEADER}`]: sameToken,
      },
      cookies: {
        [`${CSRF_COOKIE_HEADER}`]: sameToken,
      },
    });

    const mockExecutionContextInvalidToken = createMock<ExecutionContext>({
      switchToHttp: vi.fn().mockImplementation(() => ({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      })),
    });

    await expect(
      async () => await guard.canActivate(mockExecutionContextInvalidToken),
    ).rejects.toThrowWithMessage(UnauthorizedException, CSRF_TOKEN_INVALID);
  });
});
