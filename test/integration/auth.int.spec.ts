/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import TestAgent from 'supertest/lib/agent';
import { DataSource } from 'typeorm';
import {
  TestContainersSetup,
  Containers,
} from '../helpers/testcontainers.setup';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/infra/cache/redis.factory';
import { SignUpUserDTO } from 'src/resources/auth/dto/signup-user.dto';

import { User } from 'src/resources/user/entities/user.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { createMock } from '@golevelup/ts-vitest';
import { MailService } from 'src/infra/mail/mail.service';
import { calculateFutureUTCDate, checkHash, generateHash } from 'src/utils';
import { LoginUserDTO } from 'src/resources/auth/dto/login-user.dto';
import * as ErrorMessages from '../../src/common/constants/error-messages';
import cookieParser from 'cookie-parser';
import {
  withAllCredentials,
  withPrivateResourceCredentials,
  withProtectedResourceCredentials,
} from '../helpers/add-request-credentials';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { OtpAuthenticationService } from 'src/resources/auth/modules/otp/otp-authentication.service';
import { CreateUserDTO } from 'src/resources/user/dto/create-user.dto';
import { VerifyResult } from 'otplib';
import { VerifyAccountDTO } from 'src/resources/auth/dto/verify-account.dto';
import { LoginSlugDTO } from 'src/resources/auth/dto/login-slug.dto';
import { RecoveryToken } from 'src/resources/auth/modules/recovery-token/entities/recover-credentials-token.entity';
import { ResetPasswordDTO } from 'src/resources/auth/dto/reset-password.dto';
import { CacheService, CacheTokenValue } from 'src/infra/cache/cache.service';
import { _getCurrentNodeEnv } from '../helpers/ci-cd-env';

const previousNodeEnv = _getCurrentNodeEnv();

describe('Auth flow', () => {
  let app: INestApplication<App>;
  let apiClient: TestAgent;
  let containers: Containers;
  let dataSource: DataSource;
  let redisClient: Redis;
  let cacheService: CacheService;

  // mocks
  let mailService: MailService;
  let otpService: OtpAuthenticationService;

  // * Nodemailer has a 10 email limit for free tier
  const mockMailService = createMock<MailService>();
  const mockOtpService = createMock<OtpAuthenticationService>();

  beforeAll(async () => {
    // * Note: using DEBUG flag makes tests runner run later apparently and no need for timeout
    containers = await TestContainersSetup.setup(2000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: OtpAuthenticationService,
          useValue: mockOtpService,
        },
      ],
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

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    redisClient = app.get<Redis>(REDIS_CLIENT);
    cacheService = app.get<CacheService>(CacheService);

    // mocks
    mailService = app.get<MailService>(MailService);
    otpService = app.get<OtpAuthenticationService>(OtpAuthenticationService);

    apiClient = supertest(app.getHttpServer());

    process.env.NODE_ENV = previousNodeEnv; // required since some test need production environment
    await apiClient.get('/api/seed');
  });

  afterAll(async () => {
    await app.close();
    await containers.stopAllContainers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sanity check:', () => {
    it('Containers are up', () => {
      const { pgContainer, redisContainer } = containers;
      expect(pgContainer.getName()).toBeDefined();
      expect(redisContainer.getName()).toBeDefined();
    });

    it('Database and cache store connections are working', async () => {
      const query = (await dataSource.query(
        'SELECT version()',
      )) as unknown as any[];

      const redisHello = (await redisClient.hello()) as unknown as any[];
      await redisClient.set('key', 'value');

      expect(query.length).toBe(1);
      expect(query[0]).toEqual({
        version: expect.stringContaining('PostgreSQL 18.1'), // on aarch64-unknown-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit',
      });
      expect(query[0]).toEqual({
        version: expect.stringContaining('Alpine 14.2.0'), // on aarch64-unknown-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit',
      });
      expect(dataSource.isInitialized).toBe(true);
      expect(redisHello.length).not.toBe(0);
      expect(redisHello).toContain('version');
      expect(redisHello).toContain('8.4.0');
      expect(await redisClient.get('key')).toBe('value');
    });
  });

  describe('/signup (POST) - When a user wants to sign up', () => {
    beforeEach(async () => {
      // clean up
      await dataSource.getRepository(User).deleteAll();
      vi.spyOn(mailService, 'sendAccountVerification').mockResolvedValue(
        undefined,
      );
    });

    it('it should create a user', async () => {
      const signupDto: SignUpUserDTO = {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'StrongPassword123!',
      };

      await apiClient.post('/api/signup').send(signupDto).expect(200);

      const [user] = await dataSource.getRepository(User).find({
        where: { email: 'test@mail.com' },
        relations: { roles: true },
      });

      expect(user).toMatchObject({
        id: expect.any(String),
        name: signupDto.name,
        username: signupDto.username,
        email: signupDto.email,
        hash: expect.any(String),
        active: true,
        verifiedAccount: false, // ! key
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        roles: [
          expect.objectContaining({
            role: UserRole.SYS_ADMIN,
          }),
        ],
      });
    });

    it('it should hash the password', async () => {
      const signupDto: SignUpUserDTO = {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'StrongPassword123!',
      };

      await apiClient.post('/api/signup').send(signupDto).expect(200);

      const [user] = await dataSource.getRepository(User).find({
        where: { email: 'test@mail.com' },
      });

      expect(await checkHash(signupDto.password, user.hash)).toBe(true);
    });

    it('it should grant highest role', async () => {
      const signupDto: SignUpUserDTO = {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'StrongPassword123!',
      };

      await apiClient.post('/api/signup').send(signupDto).expect(200);

      const [user] = await dataSource.getRepository(User).find({
        where: { email: 'test@mail.com' },
        relations: { roles: true },
      });

      expect(user.roles[0].role).toBe(UserRole.SYS_ADMIN);
    });

    it('it should send verification email', async () => {
      const signupDto: SignUpUserDTO = {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'StrongPassword123!',
      };

      await apiClient.post('/api/signup').send(signupDto).expect(200);

      expect(
        mailService.sendAccountVerification,
      ).toHaveBeenCalledExactlyOnceWith(signupDto.email);
    });
  });

  describe('/login (POST) - When a user wants to login', async () => {
    let dbUser: User;
    const signupDto: SignUpUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(signupDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = signupDto;

    beforeEach(async () => {
      // * clean up - ORDER OF OPERATIONS MATTER, DO NOT CHANGE
      await dataSource.getRepository(User).deleteAll();

      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole] });

      dbUser = await dataSource.getRepository(User).save(draftUser);
    });

    it('it should prevent inexistent users from logging in', async () => {
      const inexistentUserDto: LoginUserDTO = {
        slug: 'idontexist',
        password: 'DoestnMatter123!',
      };

      const response = await apiClient
        .post('/api/login')
        .send(inexistentUserDto)
        .expect(401);

      expect(response.body.message).toBe(
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('it should prevent users without verified accounts from logging in', async () => {
      const loginDto: LoginUserDTO = {
        slug: signupDto.username,
        password: signupDto.password,
      };

      const response = await apiClient
        .post('/api/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toBe(
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });

    it('it should prevent inactive users from logging in', async () => {
      await dataSource.getRepository(User).update(dbUser.id, { active: false });

      const inactiveUserDto: LoginUserDTO = {
        slug: signupDto.username,
        password: signupDto.password,
      };

      const response = await apiClient
        .post('/api/login')
        .send(inactiveUserDto)
        .expect(401);

      expect(response.body.message).toBe(ErrorMessages.INACTIVE_USER);
    });

    it('it should prevent users with invalid credentials from logging in', async () => {
      const inactiveUserDto: LoginUserDTO = {
        slug: signupDto.username,
        password: 'WrongPassword333?',
      };

      const response = await apiClient
        .post('/api/login')
        .send(inactiveUserDto)
        .expect(401);

      expect(response.body.message).toBe(
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('it should allow users with verified accounts to login', async () => {
      await dataSource
        .getRepository(User)
        .update(dbUser.id, { verifiedAccount: true });

      const verifiedUserDto: LoginUserDTO = {
        slug: signupDto.username,
        password: signupDto.password,
      };

      const response = await apiClient
        .post('/api/login')
        .send(verifiedUserDto)
        .expect(200);

      const cacheToken: CacheTokenValue = {
        userId: dbUser.id,
        roles: expect.any(Array),
        active: true,
        hash: expect.any(String),
      };

      expect(response.body).toEqual({ accessToken: expect.any(String) });
      expect(await cacheService.getValue(dbUser.id)).toMatchObject(cacheToken);
    });

    describe('Application interaction - When user has logged in successfully:', async () => {
      let dbUser: User;
      const signupDto: SignUpUserDTO = {
        name: 'test',
        username: 'testuser',
        email: 'test@mail.com',
        password: 'StrongPassword123!',
      };
      const hash = await generateHash(signupDto.password);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = signupDto;

      let randomUser: User;

      beforeEach(async () => {
        // * clean up - ORDER OF OPERATIONS MATTER
        await dataSource.getRepository(User).deleteAll();
        const sysadminRole = await dataSource
          .getRepository(Role)
          .findOneByOrFail({ role: UserRole.SYS_ADMIN });

        const adminUser = dataSource.getRepository(User).create({
          ...rest,
          hash,
          roles: [sysadminRole],
          verifiedAccount: true,
        });

        dbUser = await dataSource.getRepository(User).save(adminUser);

        const userRole = await dataSource
          .getRepository(Role)
          .findOneByOrFail({ role: UserRole.USER });
        const userDraft = dataSource.getRepository(User).create({
          name: 'normal user',
          username: 'someuser',
          email: 'normal@user.com',
          hash: 'somehash',
        });
        randomUser = await dataSource.getRepository(User).save({
          ...userDraft,
          roles: [userRole],
        });
      });

      it('it should reject user accessing private resources without proper credentials (missing bearer token)', async () => {
        const verifiedUserDto: LoginUserDTO = {
          slug: signupDto.username,
          password: signupDto.password,
        };

        await apiClient.post('/api/login').send(verifiedUserDto).expect(200);

        const response = await apiClient.get('/api/user').expect(401);
        expect(response.body.message).toBe('Unauthorized'); // default Nestjs message
      });

      it('it should reject user accessing protected resources without proper credentials (missing csrf cookie token and csrf header)', async () => {
        const verifiedUserDto: LoginUserDTO = {
          slug: signupDto.username,
          password: signupDto.password,
        };

        const loginResponse = await apiClient
          .post('/api/login')
          .send(verifiedUserDto)
          .expect(200);

        const test = apiClient.del(`/api/user/${randomUser.id}`);

        const response = await withPrivateResourceCredentials(
          loginResponse,
          test,
        ).expect(401);
        expect(response.body.message).toBe(ErrorMessages.CSRF_TOKEN_MISSING);
      });

      it('it should grant access to private resources with proper credentials (valid bearer token)', async () => {
        const verifiedUserDto: LoginUserDTO = {
          slug: signupDto.username,
          password: signupDto.password,
        };

        const loginResponse = await apiClient
          .post('/api/login')
          .send(verifiedUserDto)
          .expect(200);

        const test = apiClient.get('/api/user');

        await withPrivateResourceCredentials(loginResponse, test).expect(200);
      });

      it('it should grant access to protected resources (valid bearer token, csrf cookie token and csrf header)', async () => {
        const verifiedUserDto: LoginUserDTO = {
          slug: signupDto.username,
          password: signupDto.password,
        };

        const loginResponse = await apiClient
          .post('/api/login')
          .send(verifiedUserDto)
          .expect(200);

        const test = apiClient.del(`/api/user/${randomUser.id}`);

        await withProtectedResourceCredentials(loginResponse, test).expect(200);
      });

      it('it should deny access to protected resources (insufficient permissions)', async () => {
        const userRole = await dataSource
          .getRepository(Role)
          .findOneByOrFail({ role: UserRole.USER });

        // Remove dbUser privilege role
        await dataSource
          .getRepository(User)
          .save({ ...dbUser, roles: [userRole] });

        const verifiedLowPrivilegeUserDto: LoginUserDTO = {
          slug: signupDto.username,
          password: signupDto.password,
        };

        const loginResponse = await apiClient
          .post('/api/login')
          .send(verifiedLowPrivilegeUserDto)
          .expect(200);

        const test = apiClient.del(`/api/user/${randomUser.id}`);

        const response = await withProtectedResourceCredentials(
          loginResponse,
          test,
        ).expect(403);

        expect(response.body.message).toBe(ErrorMessages.ROLE_GUARD_FORBIDDEN);
      });
    });
  });

  describe('/verify-account (POST) - When a user wants to verify its account', async () => {
    let dbUser: User;
    const createUserDto: CreateUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(createUserDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = createUserDto;

    beforeEach(async () => {
      await dataSource.getRepository(User).deleteAll();

      vi.spyOn(mailService, 'sendAccountVerification').mockResolvedValue(
        undefined,
      );

      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole] });

      dbUser = await dataSource.getRepository(User).save(draftUser);
    });

    it('it should allow users with unverified accounts perform this action', async () => {
      vi.spyOn(otpService, 'verifyCode').mockResolvedValue({
        valid: true,
      } as VerifyResult);

      const verifyAccountDto: VerifyAccountDTO = {
        code: '123456',
        email: dbUser.email,
      };

      await apiClient
        .post('/api/verify-account')
        .send(verifyAccountDto)
        .expect(200);
    });

    it('it should reject inextistent users', async () => {
      const verifyAccountDto: VerifyAccountDTO = {
        code: '123456',
        email: 'idonotexists@mail.com',
      };

      const response = await apiClient
        .post('/api/verify-account')
        .send(verifyAccountDto)
        .expect(401);
      expect(response.body.message).toBe(
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('it should prevent inactive users', async () => {
      await dataSource.getRepository(User).update(dbUser.id, { active: false });

      const verifyAccountDto: VerifyAccountDTO = {
        code: '123456',
        email: dbUser.email,
      };

      const response = await apiClient
        .post('/api/verify-account')
        .send(verifyAccountDto)
        .expect(401);
      expect(response.body.message).toBe(
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('it should prevent users with verified accounts', async () => {
      await dataSource
        .getRepository(User)
        .update(dbUser.id, { verifiedAccount: true });

      const verifyAccountDto: VerifyAccountDTO = {
        code: '123456',
        email: dbUser.email,
      };

      const response = await apiClient
        .post('/api/verify-account')
        .send(verifyAccountDto)
        .expect(400);
      expect(response.body.message).toBe(
        ErrorMessages.ACCOUNT_ALREADY_VERIFIED,
      );
    });
  });

  describe('/recover-credentials (POST) - When a user forgets his access credentials (password, email or username)', async () => {
    let dbUser: User;
    const createUserDto: CreateUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(createUserDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = createUserDto;

    beforeEach(async () => {
      await dataSource.getRepository(User).deleteAll();

      vi.spyOn(mailService, 'sendRecoveryToken').mockResolvedValue(undefined);

      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole], verifiedAccount: true });

      dbUser = await dataSource.getRepository(User).save(draftUser);
    });

    it('it should allow valid users to request a recovery token', async () => {
      const recoverCredentialsDto: LoginSlugDTO = {
        slug: dbUser.email,
      };

      await apiClient
        .post('/api/recover-credentials')
        .send(recoverCredentialsDto)
        .expect(200);
    });

    it('it should send an email with the recovery token it requested', async () => {
      const recoverCredentialsDto: LoginSlugDTO = {
        slug: dbUser.email,
      };

      await apiClient
        .post('/api/recover-credentials')
        .send(recoverCredentialsDto)
        .expect(200);

      expect(mailService.sendRecoveryToken).toHaveBeenCalledExactlyOnceWith(
        dbUser.email,
        expect.any(String),
      );
    });

    it('it should reject inextistent users', async () => {
      const recoverCredentialsDto: LoginSlugDTO = {
        slug: 'idonotexists@mail.com',
      };

      const response = await apiClient
        .post('/api/recover-credentials')
        .send(recoverCredentialsDto)
        .expect(401);
      expect(response.body.message).toBe(
        ErrorMessages.INVALID_USER_CREDENTIALS,
      );
    });

    it('it should prevent inactive users', async () => {
      await dataSource.getRepository(User).update(dbUser.id, { active: false });
      const recoverCredentialsDto: LoginSlugDTO = {
        slug: dbUser.email,
      };

      const response = await apiClient
        .post('/api/recover-credentials')
        .send(recoverCredentialsDto)
        .expect(401);
      expect(response.body.message).toBe(ErrorMessages.INACTIVE_USER);
    });

    it('it should prevent users without verified accounts', async () => {
      await dataSource
        .getRepository(User)
        .update(dbUser.id, { verifiedAccount: false });
      const recoverCredentialsDto: LoginSlugDTO = {
        slug: dbUser.email,
      };

      const response = await apiClient
        .post('/api/recover-credentials')
        .send(recoverCredentialsDto)
        .expect(400);
      expect(response.body.message).toBe(
        ErrorMessages.PENDING_ACCOUNT_VERIFICATION,
      );
    });
  });

  describe('/reset-password (POST) - When a user received a recovery token by email', async () => {
    let dbUser: User;
    let recoveryToken: RecoveryToken;
    const token = 'random-uuid1234';
    const createUserDto: CreateUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(createUserDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = createUserDto;

    beforeEach(async () => {
      // * cleanup
      await dataSource.getRepository(User).deleteAll();
      await dataSource.getRepository(RecoveryToken).deleteAll();

      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole], verifiedAccount: true });

      dbUser = await dataSource.getRepository(User).save(draftUser);

      const draftToken = dataSource.getRepository(RecoveryToken).create({
        token,
        userId: dbUser.id,
        expiresAt: calculateFutureUTCDate(24),
      });
      recoveryToken = await dataSource
        .getRepository(RecoveryToken)
        .save(draftToken);
    });

    it('it should be able to reset his password and save a new one with the received recovery token', async () => {
      const resetPasswordDto: ResetPasswordDTO = {
        password: 'NewPassword123!',
        recoveryToken: token,
      };

      await apiClient
        .post('/api/reset-password')
        .send(resetPasswordDto)
        .expect(200);

      const updatedUser = await dataSource
        .getRepository(User)
        .findOneByOrFail({ id: dbUser.id });

      expect(await checkHash(resetPasswordDto.password, updatedUser.hash)).toBe(
        true,
      );
    });

    it('it should remove all recovery tokens related to the user if request is successful', async () => {
      const resetPasswordDto: ResetPasswordDTO = {
        password: 'NewPassword123!',
        recoveryToken: token,
      };

      await apiClient
        .post('/api/reset-password')
        .send(resetPasswordDto)
        .expect(200);

      expect(
        (
          await dataSource
            .getRepository(RecoveryToken)
            .find({ where: { userId: dbUser.id } })
        ).length,
      ).toBe(0);
    });

    it('it should not be able to reset his password if the new password is the same as the last one', async () => {
      const resetPasswordDto: ResetPasswordDTO = {
        password: createUserDto.password,
        recoveryToken: token,
      };

      const response = await apiClient
        .post('/api/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe(
        ErrorMessages.INVALID_NEW_PASSWORD_ALREADY_USED,
      );
    });

    it('it should not be able to reset his password if the token does not exist', async () => {
      const resetPasswordDto: ResetPasswordDTO = {
        password: createUserDto.password,
        recoveryToken: 'non-existent-token',
      };

      const response = await apiClient
        .post('/api/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe(ErrorMessages.INVALID_RECOVERY_TOKEN);
    });

    it('it should not be able to reset his password if the token is expired', async () => {
      await dataSource
        .getRepository(RecoveryToken)
        .save({ ...recoveryToken, expiresAt: new Date('1970-01-01') });

      const resetPasswordDto: ResetPasswordDTO = {
        password: createUserDto.password,
        recoveryToken: token,
      };

      const response = await apiClient
        .post('/api/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe(ErrorMessages.INVALID_RECOVERY_TOKEN);
    });
  });

  describe('/auth/logout (POST) - When a user wants to logout', async () => {
    const signupDto: SignUpUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(signupDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = signupDto;

    const verifiedUserLoginDto: LoginUserDTO = {
      slug: signupDto.username,
      password: signupDto.password,
    };

    let loginResponse: Response;

    beforeEach(async () => {
      // * clean up - ORDER OF OPERATIONS MATTER, DO NOT CHANGE
      await dataSource.getRepository(User).deleteAll();

      // Create user
      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole], verifiedAccount: true });

      await dataSource.getRepository(User).save(draftUser);

      // Log user in
      loginResponse = await apiClient
        .post('/api/login')
        .send(verifiedUserLoginDto)
        .expect(200);
    });

    it('it should allow user with proper credentials to perform this action', async () => {
      const test = apiClient.post('/api/auth/logout');

      await withAllCredentials(loginResponse, test).expect(200);
    });

    it('it should be able to login again', async () => {
      const test = apiClient.post('/api/auth/logout');

      await withAllCredentials(loginResponse, test).expect(200);

      await apiClient.post('/api/login').send(verifiedUserLoginDto).expect(200);
    });

    it('it should not logout user without proper credentials (authorization cookie)', async () => {
      // any credential
      await apiClient.post('/api/auth/logout').expect(401);

      // with bearer token (missing authorization cookie)
      const test1 = apiClient.post('/api/auth/logout');

      await withPrivateResourceCredentials(loginResponse, test1).expect(401);

      // with bearer token, csrf token and csrf header (missing authorization cookie)
      const test2 = apiClient.post('/api/auth/logout');

      await withProtectedResourceCredentials(loginResponse, test2).expect(401);
    });
  });

  describe('/auth/revalidate-credentials (POST) - When a user access token expires', async () => {
    let dbUser: User;
    const signupDto: SignUpUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const hash = await generateHash(signupDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = signupDto;

    const verifiedUserLoginDto: LoginUserDTO = {
      slug: signupDto.username,
      password: signupDto.password,
    };

    let loginResponse: Response;

    beforeEach(async () => {
      // * clean up - ORDER OF OPERATIONS MATTER, DO NOT CHANGE
      await dataSource.getRepository(User).deleteAll();

      // Create user
      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource
        .getRepository(User)
        .create({ ...rest, hash, roles: [userRole], verifiedAccount: true });

      dbUser = await dataSource.getRepository(User).save(draftUser);

      // Log user in
      loginResponse = await apiClient
        .post('/api/login')
        .send(verifiedUserLoginDto)
        .expect(200);
    });

    it('it should allow users to revalidate credentials', async () => {
      const test = apiClient.post('/api/auth/revalidate-credentials');

      const response = await withAllCredentials(loginResponse, test).expect(
        200,
      );

      expect(response.body).toMatchObject({ accessToken: expect.any(String) });
    });

    it('it should reject request for tokens removed previously from cache ', async () => {
      await cacheService.invalidate(dbUser.id);

      const test = apiClient.post('/api/auth/revalidate-credentials');

      const response = await withAllCredentials(loginResponse, test).expect(
        401,
      );
      expect(response.body.message).toBe(ErrorMessages.INVALID_REFRESH_TOKEN);
      expect(await cacheService.getValue(dbUser.id)).toBe(null);
    });
  });

  describe('/auth/deny-access (POST) - When denying access to a given user', async () => {
    let dbUser: User;
    const signupDto: SignUpUserDTO = {
      name: 'test',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'StrongPassword123!',
    };
    const userHash = await generateHash(signupDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...userRest } = signupDto;

    const verifiedUserLoginDto: LoginUserDTO = {
      slug: signupDto.username,
      password: signupDto.password,
    };

    let adminUser: User;
    const adminSignUpDto: SignUpUserDTO = {
      name: 'admin',
      username: 'adminuser',
      email: 'admin@mail.com',
      password: 'StrongerPassword123!',
    };
    const adminHash = await generateHash(adminSignUpDto.password);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: adminPassword, ...adminRest } = adminSignUpDto;

    const verifiedAdminLoginDto: LoginUserDTO = {
      slug: adminSignUpDto.username,
      password: adminSignUpDto.password,
    };

    let userLoginResponse: Response;
    let adminLoginResponse: Response;

    beforeEach(async () => {
      // * clean up - ORDER OF OPERATIONS MATTER, DO NOT CHANGE
      await dataSource.getRepository(User).deleteAll();

      // Create users
      const userRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.USER });

      const draftUser = dataSource.getRepository(User).create({
        ...userRest,
        hash: userHash,
        roles: [userRole],
        verifiedAccount: true,
      });

      dbUser = await dataSource.getRepository(User).save(draftUser);

      const adminRole = await dataSource
        .getRepository(Role)
        .findOneByOrFail({ role: UserRole.SYS_ADMIN });

      const draftAdmin = dataSource.getRepository(User).create({
        ...adminRest,
        hash: adminHash,
        roles: [adminRole],
        verifiedAccount: true,
      });

      adminUser = await dataSource.getRepository(User).save(draftAdmin);

      // Log user in
      userLoginResponse = await apiClient
        .post('/api/login')
        .send(verifiedUserLoginDto)
        .expect(200);

      // Log admin user in
      adminLoginResponse = await apiClient
        .post('/api/login')
        .send(verifiedAdminLoginDto)
        .expect(200);
    });

    it('it should allow only highest privilege user to perform this action', async () => {
      await withProtectedResourceCredentials(
        userLoginResponse,
        apiClient.post('/api/auth/deny-access').send({ userId: adminUser.id }),
      ).expect(403);

      await withProtectedResourceCredentials(
        adminLoginResponse,
        apiClient.post('/api/auth/deny-access').send({ userId: dbUser.id }),
      ).expect(200);
    });

    it('it should disable user (deactivate) and remove his credentials from cache', async () => {
      await withProtectedResourceCredentials(
        adminLoginResponse,
        apiClient.post('/api/auth/deny-access').send({ userId: dbUser.id }),
      ).expect(200);

      const updatedUser = await dataSource
        .getRepository(User)
        .findOneByOrFail({ id: dbUser.id });

      expect(updatedUser.active).toBe(false);
      expect(await cacheService.getValue(dbUser.id)).toBe(null);
    });

    it('it should prevent deactivated user from revalidating credentials (can only access platform for the lifetime of the access token)', async () => {
      await withProtectedResourceCredentials(
        adminLoginResponse,
        apiClient.post('/api/auth/deny-access').send({ userId: dbUser.id }),
      ).expect(200);

      const test = apiClient.post('/api/auth/revalidate-credentials');

      const response = await withAllCredentials(userLoginResponse, test).expect(
        401,
      );
      expect(response.body.message).toBe(ErrorMessages.INACTIVE_USER);
    });
  });
});
