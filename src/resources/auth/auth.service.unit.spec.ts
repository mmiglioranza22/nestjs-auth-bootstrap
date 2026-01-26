/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { createMock } from '@golevelup/ts-vitest';
import { UserService } from 'src/resources/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RecoveryTokenService } from './modules/recovery-token/recovery-token.service';
import { CacheService } from 'src/infra/cache/cache.service';
import { MailService } from 'src/infra/mail/mail.service';
import { SignUpUserDTO } from './dto/signup-user.dto';
import { plainToInstance } from 'class-transformer';
import { User } from 'src/resources/user/entities/user.entity';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as ErrorMessages from '../../common/constants/error-messages';
import { LoginUserDTO } from './dto/login-user.dto';
import { generateHash } from 'src/utils';
import { type RequestAgent } from './interfaces/request-agent.interface';
import { LoginSlugDTO } from './dto/login-slug.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { RecoveryToken } from './modules/recovery-token/entities/recover-credentials-token.entity';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';
import { type JwtPayload } from './interfaces/jwt-payload.interface';
import { OtpAuthenticationService } from './modules/otp/otp-authentication.service';
import { VerifyAccountDTO } from './dto/verify-account.dto';

describe(AuthService.name, () => {
  let service: AuthService;

  const mockUserService = createMock<UserService>({
    createUser: vi.fn().mockResolvedValue(plainToInstance(User, {})),
    findOneById: vi.fn().mockResolvedValue(
      plainToInstance(User, {
        active: true,
      }),
    ),
    verifyUserAccount: vi.fn(),
    findOneBySlug: vi.fn(),
  });
  const mockJwtService = createMock<JwtService>({
    sign: vi.fn().mockReturnValue('jwt-token'),
    verifyAsync: vi.fn(),
  });
  const mockRecoveryTokenService = createMock<RecoveryTokenService>({
    createRecoveryToken: vi.fn(),
    getRecoveryToken: vi.fn().mockResolvedValue({
      userId: 'uuid1234',
      token: 'recovery-token',
      expiresAt: new Date('2099-12-12'),
    }),
  });
  const mockMailService = createMock<MailService>({
    sendAccountVerification: vi.fn(),
    sendRecoveryToken: vi.fn(),
  });
  const mockCacheService = createMock<CacheService>({
    validate: vi.fn(),
  });
  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockReturnValue('secret_refresh_token'),
  });
  const mockOtpService = createMock<OtpAuthenticationService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RecoveryTokenService,
          useValue: mockRecoveryTokenService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OtpAuthenticationService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Sign up:', () => {
    it('should create user', async () => {
      const signupDto = plainToInstance(SignUpUserDTO, {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'Super_password123!',
      });

      await service.signupUser(signupDto);

      expect(mockUserService.createUser).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining(signupDto),
      );
    });

    it('should send email for account verification', async () => {
      const signupDto = plainToInstance(SignUpUserDTO, {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'Super_password123!',
      });

      await service.signupUser(signupDto);

      expect(mockMailService.sendAccountVerification).toHaveBeenCalledOnce();
    });

    it('should throw if an error occurs during user creation', async () => {
      const signupDto = plainToInstance(SignUpUserDTO, {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'Super_password123!',
      });

      vi.spyOn(mockUserService, 'createUser').mockResolvedValue(null);

      const result = service.signupUser(signupDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        InternalServerErrorException,
        ErrorMessages.SIGNUP_ERROR,
      );
    });
  });

  describe('Verify Account', () => {
    it('should find user by id and verify account if found', async () => {
      const dto = plainToInstance(VerifyAccountDTO, {
        email: 'test@mail.com',
        code: '123456',
      });
      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: false,
        }),
      );

      await service.verifyAccount(dto);

      expect(mockUserService.findOneBySlug).toHaveBeenCalledExactlyOnceWith({
        slug: dto.email,
      });
    });

    it('should throw if user is not found', async () => {
      const dto = plainToInstance(VerifyAccountDTO, {
        email: 'test@mail.com',
        code: '123456',
      });
      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(null);

      const result = service.verifyAccount(dto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user is inactive', async () => {
      const dto = plainToInstance(VerifyAccountDTO, {
        email: 'test@mail.com',
        code: '123456',
      });
      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: false,
        }),
      );

      const result = service.verifyAccount(dto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user account is already verified (no-op)', async () => {
      const dto = plainToInstance(VerifyAccountDTO, {
        email: 'test@mail.com',
        code: '123456',
      });
      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: true,
        }),
      );

      const result = service.verifyAccount(dto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.ACCOUNT_ALREADY_VERIFIED,
      );
    });
  });

  describe('Login:', () => {
    it('should find user by slug', async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const userHash = await generateHash(loginUserDto.password);

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          hash: userHash,
          verifiedAccount: true,
          roles: [],
        }),
      );

      await service.loginUser(loginUserDto);

      expect(mockUserService.findOneBySlug).toHaveBeenCalledExactlyOnceWith(
        loginUserDto,
      );
    });

    it('should throw if user does not exists', async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(null);

      const result = service.loginUser(loginUserDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if found user hash does not match with provided password', async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const wrongHash = await generateHash('Not_the_users_password_321?');

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          hash: wrongHash,
        }),
      );

      const result = service.loginUser(loginUserDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user is inactive', async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const userHash = await generateHash(loginUserDto.password);

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: false,
          hash: userHash,
        }),
      );

      const result = service.loginUser(loginUserDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INACTIVE_USER,
      );
    });

    it('should throw if user account is not verified', async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const userHash = await generateHash(loginUserDto.password);

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          hash: userHash,
          verifiedAccount: false,
          roles: [],
        }),
      );

      const result = service.loginUser(loginUserDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });

    it('should create users tokens', async () => {
      const userId = 'uuid1234';
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const userHash = await generateHash(loginUserDto.password);

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          id: userId,
          active: true,
          hash: userHash,
          verifiedAccount: true,
          roles: [],
        }),
      );

      await service.loginUser(loginUserDto);

      // createUserTokens
      expect(mockConfigService.getOrThrow).toHaveBeenCalledExactlyOnceWith(
        'JWT_REFRESH_TOKEN_TTL',
      );

      // rotateTokens
      expect(mockCacheService.invalidate).toHaveBeenCalledExactlyOnceWith(
        userId,
      );
      expect(mockCacheService.insert).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: userId,
        }),
        expect.any(String),
      );
    });

    it("should return accessToken, refreshToken and user's id", async () => {
      const loginUserDto = plainToInstance(LoginUserDTO, {
        slug: 'testuser',
        password: 'Super_password123!',
      });
      const userHash = await generateHash(loginUserDto.password);

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          id: 'uuid1234',
          active: true,
          hash: userHash,
          verifiedAccount: true,
          roles: [],
        }),
      );

      const { accessToken, refreshToken } =
        await service.loginUser(loginUserDto);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });
  });

  describe('Logout:', () => {
    it('should delete cached tokens', async () => {
      const userRefreshToken = 'jwt-token';
      const userId = 'uuid1234';

      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue({
        sub: userId,
      });

      await service.logoutUser(userRefreshToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledExactlyOnceWith(
        userRefreshToken,
      );
      expect(mockCacheService.invalidate).toHaveBeenCalledExactlyOnceWith(
        userId,
      );
    });
  });

  describe('Revoke user access:', () => {
    it('should throw if the agent wants to revoke access to himself', async () => {
      const userId = 'uuid1234';
      const agent: RequestAgent = {
        id: userId,
        active: true,
        roles: [],
      };

      const result = service.revokeUserAccess(userId, agent);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.IMPOSSIBLE_ACTION_TO_SELF,
      );
    });

    it('should deactivate user and delete cached tokens', async () => {
      const userId = 'uuid1234';
      const agent: RequestAgent = {
        id: 'uuid5678',
        active: true,
        roles: [],
      };

      await service.revokeUserAccess(userId, agent);

      expect(mockUserService.deactivateUser).toHaveBeenCalledExactlyOnceWith(
        userId,
        agent,
      );
      expect(mockCacheService.invalidate).toHaveBeenCalledExactlyOnceWith(
        userId,
      );
    });
  });

  describe('Token revalidation:', () => {
    it('should check cached token in database, create a new user tokens and save them in cache', async () => {
      const userId = 'uuid1234';
      const refreshTokenCheck = 'some-valid-uuid';
      const jwtPayload: JwtPayload = {
        sub: userId,
        check: refreshTokenCheck,
      };
      const cookieRefreshToken =
        "new JwtService({ secret: 'some-secret' }).sign(jwtPayload);";

      // payload
      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(jwtPayload);

      // validatedUser
      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          id: userId,
          active: true,
          verifiedAccount: true,
        }),
      );

      // isValid
      vi.spyOn(mockCacheService, 'validate').mockResolvedValue(true);

      await service.revalidateUserTokens(cookieRefreshToken);

      // verifyUserRefreshToken
      expect(mockJwtService.verifyAsync).toHaveBeenCalledExactlyOnceWith(
        cookieRefreshToken,
      );
      expect(mockUserService.findOneById).toHaveBeenCalledExactlyOnceWith(
        jwtPayload.sub,
      );
      expect(mockCacheService.validate).toHaveBeenCalledExactlyOnceWith(
        userId,
        jwtPayload.check,
      );

      // createUserTokens
      expect(mockConfigService.getOrThrow).toHaveBeenCalledExactlyOnceWith(
        'JWT_REFRESH_TOKEN_TTL',
      );

      // rotateTokens
      expect(mockCacheService.invalidate).toHaveBeenCalledExactlyOnceWith(
        userId,
      );
      expect(mockCacheService.insert).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: userId,
        }),
        expect.any(String),
      );
    });

    it('should throw if user is not found (sent via token payload)', async () => {
      const userId = 'uuid1234';
      const refreshTokenCheck = 'some-valid-uuid';
      const jwtPayload: JwtPayload = { sub: userId, check: refreshTokenCheck };
      const cookieRefreshToken =
        "new JwtService({ secret: 'some-secret' }).sign(jwtPayload);";

      // payload
      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(jwtPayload);

      // validatedUser
      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(null);

      const result = service.revalidateUserTokens(cookieRefreshToken);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user is inactive', async () => {
      const userId = 'uuid1234';
      const refreshTokenCheck = 'some-valid-uuid';
      const jwtPayload: JwtPayload = { sub: userId, check: refreshTokenCheck };
      const cookieRefreshToken =
        "new JwtService({ secret: 'some-secret' }).sign(jwtPayload);";

      // payload
      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(jwtPayload);

      // validatedUser
      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          active: false,
        }),
      );

      const result = service.revalidateUserTokens(cookieRefreshToken);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INACTIVE_USER,
      );
    });

    it('should throw if user account is not verified', async () => {
      const userId = 'uuid1234';
      const refreshTokenCheck = 'some-valid-uuid';
      const jwtPayload: JwtPayload = { sub: userId, check: refreshTokenCheck };
      const cookieRefreshToken =
        "new JwtService({ secret: 'some-secret' }).sign(jwtPayload);";

      // payload
      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(jwtPayload);

      // validatedUser
      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: false,
        }),
      );

      const result = service.revalidateUserTokens(cookieRefreshToken);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });

    it('should throw if refresh token does not match cached hash', async () => {
      const userId = 'uuid1234';
      const refreshTokenCheck = 'some-valid-uuid';
      const jwtPayload: JwtPayload = { sub: userId, check: refreshTokenCheck };
      const cookieRefreshToken =
        "new JwtService({ secret: 'some-secret' }).sign(jwtPayload);";

      // payload
      vi.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(jwtPayload);

      // validatedUser
      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          id: userId,
          active: true,
          verifiedAccount: true,
        }),
      );

      vi.spyOn(mockCacheService, 'validate').mockResolvedValue(false);

      const result = service.revalidateUserTokens(cookieRefreshToken);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_REFRESH_TOKEN,
      );
    });
  });

  describe('Recover credentials"', () => {
    it('should check if user exists', async () => {
      const loginSlugDto = plainToInstance(LoginSlugDTO, { slug: 'usertest' });

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: true,
        }),
      );

      await service.recoverCredentials(loginSlugDto);

      expect(mockUserService.findOneBySlug).toHaveBeenCalledExactlyOnceWith(
        loginSlugDto,
      );
    });

    it('should throw if user does not exists', async () => {
      const loginSlugDto = plainToInstance(LoginSlugDTO, { slug: 'usertest' });
      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(null);

      const result = service.recoverCredentials(loginSlugDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user is inactive', async () => {
      const loginSlugDto = plainToInstance(LoginSlugDTO, { slug: 'usertest' });

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: false,
        }),
      );

      const result = service.recoverCredentials(loginSlugDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INACTIVE_USER,
      );
    });

    it('should throw if user account is not verified', async () => {
      const loginSlugDto = plainToInstance(LoginSlugDTO, { slug: 'usertest' });

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: false,
        }),
      );

      const result = service.recoverCredentials(loginSlugDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });

    it('should create recovery token and send it by email to the user', async () => {
      const userId = 'uuid1234';
      const loginSlugDto = plainToInstance(LoginSlugDTO, {
        slug: 'usertest',
      });

      vi.spyOn(mockUserService, 'findOneBySlug').mockResolvedValue(
        plainToInstance(User, {
          id: userId,
          active: true,
          verifiedAccount: true,
        }),
      );

      await service.recoverCredentials(loginSlugDto);

      expect(
        mockRecoveryTokenService.createRecoveryToken,
      ).toHaveBeenCalledExactlyOnceWith(userId);
      expect(mockMailService.sendRecoveryToken).toHaveBeenCalledOnce();
    });
  });

  describe('Reset password', () => {
    it('should check for existing recovery token and user', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: true,
        }),
      );

      await service.resetUserPassword(resetPasswordDto);

      expect(
        mockRecoveryTokenService.getRecoveryToken,
      ).toHaveBeenCalledExactlyOnceWith(resetPasswordDto.recoveryToken);
      expect(mockUserService.findOneById).toHaveBeenCalledOnce();
    });

    it('should throw if recovery token is not found', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockRecoveryTokenService, 'getRecoveryToken').mockResolvedValue(
        null,
      );

      const result = service.resetUserPassword(resetPasswordDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_RECOVERY_TOKEN,
      );
    });

    it('should throw if recovery token is expired', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockRecoveryTokenService, 'getRecoveryToken').mockResolvedValue(
        plainToInstance(RecoveryToken, {
          expiresAt: new Date('1970-01-01'),
        }),
      );

      const result = service.resetUserPassword(resetPasswordDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_RECOVERY_TOKEN,
      );
    });

    it('should throw if user does not exists', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockRecoveryTokenService, 'getRecoveryToken').mockResolvedValue(
        plainToInstance(RecoveryToken, {
          expiresAt: new Date('2099-12-12'),
        }),
      );

      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(null);

      const result = service.resetUserPassword(resetPasswordDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('should throw if user is inactive', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockRecoveryTokenService, 'getRecoveryToken').mockResolvedValue(
        plainToInstance(RecoveryToken, {
          expiresAt: new Date('2099-12-12'),
        }),
      );

      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          active: false,
        }),
      );

      const result = service.resetUserPassword(resetPasswordDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        UnauthorizedException,
        ErrorMessages.INACTIVE_USER,
      );
    });

    it('should throw if user account is not verified', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      vi.spyOn(mockRecoveryTokenService, 'getRecoveryToken').mockResolvedValue(
        plainToInstance(RecoveryToken, {
          expiresAt: new Date('2099-12-12'),
        }),
      );

      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          active: true,
          verifiedAccount: false,
        }),
      );

      const result = service.resetUserPassword(resetPasswordDto);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });

    it('should update user password and delete used recovery token', async () => {
      const resetPasswordDto = plainToInstance(ResetPasswordDTO, {
        password: 'New_super_safe_pass_1234!',
        recoveryToken: 'token-sent-by-email',
      });

      const validatedUserId = 'uuid1234';

      vi.spyOn(mockUserService, 'findOneById').mockResolvedValue(
        plainToInstance(User, {
          id: validatedUserId,
          active: true,
          verifiedAccount: true,
        }),
      );

      await service.resetUserPassword(resetPasswordDto);

      expect(
        mockUserService.updateUserPassword,
      ).toHaveBeenCalledExactlyOnceWith(
        expect.any(User),
        resetPasswordDto.password,
      );
      expect(
        mockRecoveryTokenService.removeUserRecoveryTokens,
      ).toHaveBeenCalledExactlyOnceWith(validatedUserId);
      expect(mockCacheService.invalidate).toHaveBeenCalledExactlyOnceWith(
        validatedUserId,
      );
    });
  });
});
