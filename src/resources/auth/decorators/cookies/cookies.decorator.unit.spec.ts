import { createMock } from '@golevelup/ts-vitest';
import { cookies, Cookies } from './cookies.decorator';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { type SignedCookies } from 'src/resources/auth/interfaces/signed-cookies.interface';
import { INVALID_MISSING_COOKIES } from 'src/common/constants/error-messages';

// * Only focused on signed cookies
describe(Cookies.name, () => {
  it('should throw if signed cookies are required and these are not sent as expected', () => {
    const mockExecutionContextWithoutSignedCookies =
      createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            signedCookies: null,
          }),
        }),
      });

    const mockExecutionContextWithoutRegularCookies =
      createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: null,
          }),
        }),
      });

    expect(() =>
      cookies('signed', mockExecutionContextWithoutSignedCookies),
    ).toThrowWithMessage(BadRequestException, INVALID_MISSING_COOKIES);

    expect(() =>
      cookies('x-time-cookie', mockExecutionContextWithoutRegularCookies),
    ).toThrowWithMessage(BadRequestException, INVALID_MISSING_COOKIES);
  });

  it('should return regular cookies if not particular one is required', () => {
    const mockCookieResponse = {
      someCookie: 'Delicia',
    };
    const mockExecutionContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: mockCookieResponse,
          signedCookies: null,
        }),
      }),
    });

    const result = cookies(undefined, mockExecutionContext);

    expect(result).toEqual(mockCookieResponse);
  });

  it('should return specific cookie if requested, or null if it does not exist', () => {
    const mockCookieResponse = {
      'x-important-cookie': 'so important',
    };

    const notExistingCookie = {};

    const mockExecutionContextWithCookie = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: mockCookieResponse,
        }),
      }),
    });

    const mockExecutionContextWithoutRequiredCookie =
      createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: notExistingCookie,
          }),
        }),
      });

    const resultWithCookie = cookies(
      'x-important-cookie',
      mockExecutionContextWithCookie,
    );
    const resultCookieNotFound = cookies(
      'x-cookie-not-found',
      mockExecutionContextWithoutRequiredCookie,
    );

    expect(resultWithCookie).toEqual(mockCookieResponse['x-important-cookie']);
    expect(resultCookieNotFound).toEqual(null);
  });

  it('should return signed cookies if requested', () => {
    const mockSignedCookies: SignedCookies = {
      Authentication: 'token',
    };
    const mockExecutionContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          signedCookies: mockSignedCookies,
        }),
      }),
    });

    const result = cookies('signed', mockExecutionContext);

    expect(result).toEqual(mockSignedCookies);
  });
});
