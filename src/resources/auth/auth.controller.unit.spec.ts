/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';
import { PassportModule } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { SignUpUserDTO } from './dto/signup-user.dto';
import { LoginUserDTO } from './dto/login-user.dto';
import { Response } from 'express';
import { type SignedCookies } from './interfaces/signed-cookies.interface';
import { LoginSlugDTO } from './dto/login-slug.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { type RequestAgent } from './interfaces/request-agent.interface';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { UserIdDTO } from './dto/user-id.dto';
import { CacheService } from 'src/infra/cache/cache.service';
import { CsrfTokenService } from './modules/csrf-token/csrf-token.service';
import { VerifyAccountDTO } from './dto/verify-account.dto';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_HEADER,
  CSRF_COOKIE_PATH,
} from './constants';

describe(AuthController.name, () => {
  let controller: AuthController;

  const mockRefreshToken = 'refresh_token';
  const mockAccessToken = 'access_token';
  const mockUserId = 'user_uuid1234';
  const signedCookiesKeyObject: SignedCookies = {
    Authentication: 'Authentication',
  };

  const mockAuthService = createMock<AuthService>({
    loginUser: vi.fn().mockResolvedValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      user: mockUserId,
    }),
    revalidateUserTokens: vi.fn().mockResolvedValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    }),
    recoverCredentials: vi.fn(),
    resetUserPassword: vi.fn(),
  });
  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockImplementation(() => 24),
  });

  // deps used by guards
  const mockCacheService = createMock<CacheService>(); // UserRoleGuard
  const mockCsrfService = createMock<CsrfTokenService>({
    generateCsrfToken: vi.fn().mockReturnValue('random'),
  }); // CsrfGuard

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CsrfTokenService,
          useValue: mockCsrfService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Public routes', () => {
    it('should allow new users to sign up', async () => {
      const signupDto = plainToInstance(SignUpUserDTO, {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'Super_password123!',
      });

      await controller.signup(signupDto);

      expect(mockAuthService.signupUser).toHaveBeenCalledExactlyOnceWith(
        signupDto,
      );
    });

    it('should allow users to verify their account', async () => {
      const dto = plainToInstance(VerifyAccountDTO, {
        code: '123456',
        email: 'test@mail.com',
      });

      await controller.signupConfirmation(dto);

      expect(mockAuthService.verifyAccount).toHaveBeenCalledExactlyOnceWith(
        dto,
      );
    });

    describe('Login:', () => {
      it('should allow users to login', async () => {
        const mockResponse = createMock<Response>();
        const loginDto = plainToInstance(LoginUserDTO, {
          slug: 'test@mail.com',
          password: 'Super_secret123!',
        });

        await controller.login(loginDto, mockResponse);

        expect(mockAuthService.loginUser).toHaveBeenCalledExactlyOnceWith(
          loginDto,
        );
      });

      it('should return access token and set signed cookies in response object', async () => {
        const mockResponse = createMock<Response>();
        const loginDto = plainToInstance(LoginUserDTO, {
          slug: 'test@mail.com',
          password: 'Super_secret123!',
        });

        const { accessToken } = await controller.login(loginDto, mockResponse);

        expect(accessToken).toBeDefined();
        expect(accessToken).toEqual(mockAccessToken);
        expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
        expect(mockResponse.cookie).toHaveBeenNthCalledWith(
          1,
          signedCookiesKeyObject.Authentication,
          mockRefreshToken,
          {
            sameSite: 'strict',
            httpOnly: true,
            secure: true,
            signed: true,
            path: AUTH_COOKIE_PATH,
            maxAge: 24, // hardcoded mock for other tests, leave as is
          },
        );
        expect(mockResponse.cookie).toHaveBeenNthCalledWith(
          2,
          CSRF_COOKIE_HEADER,
          expect.any(String),
          {
            sameSite: 'strict',
            httpOnly: false,
            secure: true,
            path: CSRF_COOKIE_PATH,
            maxAge: 24, // hardcoded mock for other tests, leave as is
          },
        );
      });
    });

    describe('Revalidate credentials:', () => {
      it('should allow users to revalidate credentials', async () => {
        const mockResponse = createMock<Response>();
        const mockSignedCookies: SignedCookies = {
          Authentication: 'auth-cookie-token',
        };

        await controller.revalidateCredentials(mockSignedCookies, mockResponse);

        expect(
          mockAuthService.revalidateUserTokens,
        ).toHaveBeenCalledExactlyOnceWith(mockSignedCookies.Authentication);
      });

      it('should return access token and set signed cookies in response object', async () => {
        const mockResponse = createMock<Response>();
        const mockSignedCookies: SignedCookies = {
          Authentication: 'auth-cookie-token',
        };

        const { accessToken } = await controller.revalidateCredentials(
          mockSignedCookies,
          mockResponse,
        );

        expect(accessToken).toBeDefined();
        expect(accessToken).toEqual(mockAccessToken);
        expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
        expect(mockResponse.cookie).toHaveBeenNthCalledWith(
          1,
          signedCookiesKeyObject.Authentication,
          mockRefreshToken,
          {
            sameSite: 'strict',
            httpOnly: true,
            secure: true,
            signed: true,
            path: AUTH_COOKIE_PATH,
            maxAge: 24, // hardcoded mock for other tests, leave as is
          },
        );
        expect(mockResponse.cookie).toHaveBeenNthCalledWith(
          2,
          CSRF_COOKIE_HEADER,
          expect.any(String),
          {
            sameSite: 'strict',
            httpOnly: false,
            secure: true,
            path: CSRF_COOKIE_PATH,
            maxAge: 24, // hardcoded mock for other tests, leave as is
          },
        );
      });
    });

    describe('Recover credentials:', () => {
      it('should allow users to recover credentials', async () => {
        const mockResponse = createMock<Response>();
        const loginSlugDto = plainToInstance(LoginSlugDTO, {
          slug: 'testuser1234',
        });

        await controller.recoverCredentials(loginSlugDto, mockResponse);

        expect(
          mockAuthService.recoverCredentials,
        ).toHaveBeenCalledExactlyOnceWith(loginSlugDto);
      });

      it('should clear signed cookies', async () => {
        const mockResponse = createMock<Response>();
        const loginSlugDto = plainToInstance(LoginSlugDTO, {
          slug: 'testuser1234',
        });

        await controller.recoverCredentials(loginSlugDto, mockResponse);

        expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          1,
          signedCookiesKeyObject.Authentication,
          { path: AUTH_COOKIE_PATH },
        );
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          2,
          CSRF_COOKIE_HEADER,
          { path: CSRF_COOKIE_PATH },
        );
      });
    });

    describe('Reset password:', () => {
      it('should allow users to reset their password', async () => {
        const mockResponse = createMock<Response>();
        const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
          password: 'testuser1234',
          recoveryToken: 'some-token',
        });

        await controller.resetPassword(resetPasswordDto, mockResponse);

        expect(
          mockAuthService.resetUserPassword,
        ).toHaveBeenCalledExactlyOnceWith(resetPasswordDto);
      });

      it('should clear signed cookies', async () => {
        const mockResponse = createMock<Response>();
        const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
          password: 'testuser1234',
          recoveryToken: 'some-token',
        });

        await controller.resetPassword(resetPasswordDto, mockResponse);

        expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          1,
          signedCookiesKeyObject.Authentication,
          { path: AUTH_COOKIE_PATH },
        );
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          2,
          CSRF_COOKIE_HEADER,
          { path: CSRF_COOKIE_PATH },
        );
      });
    });
  });

  describe('Protected / Private routes', () => {
    describe('Logout:', () => {
      it('should allow users to logout', async () => {
        const mockResponse = createMock<Response>();
        const userId = 'uuid1234';
        const authCookie: SignedCookies = {
          Authentication: userId,
        };

        await controller.logout(authCookie, mockResponse);

        expect(mockAuthService.logoutUser).toHaveBeenCalledExactlyOnceWith(
          userId,
        );
      });

      it('should clear signed cookies on user logout', async () => {
        const mockResponse = createMock<Response>();
        const userId = 'uuid1234';
        const authCookie: SignedCookies = {
          Authentication: userId,
        };

        await controller.logout(authCookie, mockResponse);

        expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          1,
          signedCookiesKeyObject.Authentication,
          { path: AUTH_COOKIE_PATH },
        );
        expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
          2,
          CSRF_COOKIE_HEADER,
          {
            path: CSRF_COOKIE_PATH,
          },
        );
      });
    });

    it('it should allow only highest privilege users to deny-access to specific users', async () => {
      const agent: RequestAgent = {
        id: 'uuid1234',
        active: true,
        roles: [UserRole.ADMIN], // tested in service tests
      };
      const targetUser = plainToInstance(UserIdDTO, { userId: 'uuid5678' });

      await controller.denyUserAccess(targetUser, agent);

      expect(mockAuthService.revokeUserAccess).toHaveBeenCalledExactlyOnceWith(
        targetUser.userId,
        agent,
      );
    });
  });
});
