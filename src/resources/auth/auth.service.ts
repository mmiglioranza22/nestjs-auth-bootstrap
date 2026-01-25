import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  JsonWebTokenError,
  JwtService,
  JwtSignOptions,
  TokenExpiredError,
} from '@nestjs/jwt';
import { UserService } from 'src/resources/user/user.service';
import { MailService } from 'src/infra/mail/mail.service';
import { LoginUserDTO } from './dto/login-user.dto';
import { SignUpUserDTO } from './dto/signup-user.dto';
import { type JwtPayload } from './interfaces/jwt-payload.interface';
import { checkHash, generateHash, generateRandomUUID } from 'src/utils';
import * as ErrorMessages from 'src/common/constants/error-messages';
import { type RequestAgent } from './interfaces/request-agent.interface';
import { LoginSlugDTO } from './dto/login-slug.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { RecoveryTokenService } from './modules/recovery-token/recovery-token.service';
import { type UserTokens } from './modules/recovery-token/interfaces/user-tokens.interface';
import { CacheService } from 'src/infra/cache/cache.service';
import { User } from 'src/resources/user/entities/user.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';
import { VerifyAccountDTO } from './dto/verify-account.dto';
import { OtpAuthenticationService } from './modules/otp/otp-authentication.service';

//  RULE OF THUMB: Clear cache / tokens if we know the flow assures is the actual user doing that action (not a malicious one abusing public endpoints)
// wherever token are created/updated/deleted in db, do accordingly in cache and cookies
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly recoveryTokenService: RecoveryTokenService,
    private readonly mailService: MailService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService<EnvVariables>,
    private readonly otpService: OtpAuthenticationService,
  ) {}

  async signupUser(signUpUserDto: SignUpUserDTO): Promise<void> {
    const user = await this.userService.createUser({
      ...signUpUserDto,
      roles: [UserRole.SYS_ADMIN],
    });

    if (!user) {
      throw new InternalServerErrorException(ErrorMessages.SIGNUP_ERROR);
    }
    // * could chage if EVP gets passed
    await this.mailService.sendAccountVerification(user.email);
  }

  async verifyAccount({ email, code }: VerifyAccountDTO): Promise<void> {
    const user = await this.userService.findOneBySlug({ slug: email });

    if (!user || !user.active) {
      throw new UnauthorizedException(ErrorMessages.INVALID_USER_CREDENTIALS);
    }

    if (user.verifiedAccount) {
      throw new BadRequestException(ErrorMessages.ACCOUNT_ALREADY_VERIFIED);
    }

    const { valid } = await this.otpService.verifyCode(code);

    if (valid) {
      await this.userService.verifyUserAccount(user);
    }
  }

  async loginUser(loginUserDto: LoginUserDTO): Promise<UserTokens> {
    const user = await this.userService.findOneBySlug(loginUserDto);

    if (!user || !(await checkHash(loginUserDto.password, user.hash))) {
      throw new UnauthorizedException(ErrorMessages.INVALID_USER_CREDENTIALS);
    }

    if (!user.active) {
      throw new UnauthorizedException(ErrorMessages.INACTIVE_USER);
    }

    if (!user.verifiedAccount) {
      throw new BadRequestException(ErrorMessages.PENDING_ACCOUNT_VERIFICATION);
    }

    // * Create new tokens on every login (rotate refesh token)
    const {
      accessToken,
      refreshToken,
      refreshTokenHash: refreshTokenCheck,
    } = await this.createUserTokens(user.id, user.id);

    //  ? Rotating refresh token in cache forces single device login (review if multiple device login is desired)
    await this.rotateTokens(user, refreshTokenCheck);

    return { accessToken, refreshToken };
  }

  async logoutUser(userRefreshToken: string): Promise<void> {
    const payload: { sub: string } =
      await this.jwtService.verifyAsync(userRefreshToken);
    await this.cacheService.invalidate(payload.sub);
  }

  async revokeUserAccess(userId: string, agent: RequestAgent): Promise<void> {
    if (userId === agent.id) {
      throw new BadRequestException(ErrorMessages.IMPOSSIBLE_ACTION_TO_SELF);
    }

    await Promise.all([
      this.userService.deactivateUser(userId, agent), // * future logins will fail, user can't access protected resources (no need to wait for refresh token expiry -> UserRoleGuard checks cache on request)
      this.cacheService.invalidate(userId), // no longer granted access through cache
    ]);
  }

  // * Users can only refresh their own valid tokens (sent via cookies)
  // * Main login: check refresh token (valid, not expired and in cache db), then find user in db and check if user passes checks. If ok, rotate old refresh tokens and  generate new tokens
  async revalidateUserTokens(cookieRefreshToken: string): Promise<UserTokens> {
    const verifiedToken = await this.verifyUserRefreshToken(cookieRefreshToken);

    // ? Inner errors thrown are squashed here
    if (!verifiedToken || !verifiedToken?.isValid) {
      throw new UnauthorizedException(ErrorMessages.INVALID_REFRESH_TOKEN);
    }

    // * Generate new tokens
    const {
      accessToken,
      refreshToken,
      refreshTokenHash: refreshTokenCheck,
    } = await this.createUserTokens(
      verifiedToken.user.id,
      verifiedToken.user.id,
    );

    // * Rotate refresh token in cache
    await this.rotateTokens(verifiedToken.user, refreshTokenCheck);

    return { accessToken, refreshToken };
  }

  async recoverCredentials(loginSlugDto: LoginSlugDTO) {
    const user = await this.userService.findOneBySlug(loginSlugDto);

    const validatedUser = this.userCanPerformAction(user);
    if (validatedUser) {
      const recoveryToken = await this.recoveryTokenService.createRecoveryToken(
        validatedUser.id,
      );

      await this.mailService.sendRecoveryToken(
        validatedUser.email,
        recoveryToken,
      );
    }
    // fail silently, although it could monitor ip request
  }

  async resetUserPassword({
    password,
    recoveryToken,
  }: ResetPasswordDTO): Promise<void> {
    const token =
      await this.recoveryTokenService.getRecoveryToken(recoveryToken);

    // could make util for comparison
    if (!token || token.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(ErrorMessages.INVALID_RECOVERY_TOKEN);
    }

    const user = await this.userService.findOneById(token.userId);

    const validatedUser = this.userCanPerformAction(user);

    if (validatedUser) {
      await Promise.all([
        // * Set new password
        this.userService.updateUserPassword(validatedUser, password),
        // * Remove recovery tokens (one time use)
        this.recoveryTokenService.removeUserRecoveryTokens(validatedUser.id),
        // * Invalidate existing refresh tokens in cache (case: stolen credentials - tokens, password)
        this.cacheService.invalidate(validatedUser.id),
      ]);
    }
  }

  private async createUserTokens(
    accessTokenSub: string,
    refreshTokenSub: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
  }> {
    const random = generateRandomUUID();
    const hash = await generateHash(random);
    return {
      accessToken: this.signToken({ sub: accessTokenSub }),
      refreshToken: this.signToken(
        { sub: refreshTokenSub, check: random },
        {
          expiresIn: this.configService.getOrThrow('JWT_REFRESH_TOKEN_TTL'),
        },
      ),
      refreshTokenHash: hash,
    };
  }

  private signToken(
    { sub, ...payload }: JwtPayload,
    options?: JwtSignOptions,
  ): string {
    return this.jwtService.sign({ sub, ...payload }, options);
  }

  // * Only token check related logic (verify refresh jwt token integrity, check if sub has a user in db, check if that user exists, can perform actions AND is has a saved token in cache)
  private async verifyUserRefreshToken(
    userRefreshToken: string,
  ): Promise<{ isValid: boolean; user: User } | undefined> {
    try {
      // * Check token integrity and get user id from payload
      const payload: JwtPayload =
        await this.jwtService.verifyAsync(userRefreshToken);

      // * Check user in db (might not exist)
      const user = await this.userService.findOneById(payload.sub);

      // * Check user exists and can interact with resources
      const validatedUser = this.userCanPerformAction(user); // verifiedAccount account check here is redundant

      // * Check if the user in the refresh token paylod had a saved token in cache
      const isValid = await this.cacheService.validate(
        validatedUser.id,
        payload.check!,
      );

      return { isValid, user: validatedUser };
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw new TokenExpiredError(
          ErrorMessages.EXPIRED_REFRESH_TOKEN,
          error.expiredAt,
        );
      } else if (error instanceof JsonWebTokenError) {
        // send event to monitoring with request timestamp, ip and userid
        // cached token should not be invalidated since valid user does not need to be affected by an attacker's attempt
        throw new UnauthorizedException(ErrorMessages.TAMPERED_REFRESH_TOKEN);
      } else {
        // bubbles up specific userCanPerformAction errors
        throw error;
      }
    }
  }

  private async rotateTokens(
    user: User,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.cacheService.invalidate(user.id);
    await this.cacheService.insert(user, refreshTokenHash);
  }

  private userCanPerformAction(user: User | null): User {
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.INVALID_USER_CREDENTIALS);
    }

    if (!user.active) {
      throw new UnauthorizedException(ErrorMessages.INACTIVE_USER);
    }

    if (!user.verifiedAccount) {
      throw new BadRequestException(ErrorMessages.PENDING_ACCOUNT_VERIFICATION);
    }

    return user;
  }
}
