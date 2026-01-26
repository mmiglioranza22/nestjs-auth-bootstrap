/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, type CacheTokenValue } from './cache.service';
import { createMock } from '@golevelup/ts-vitest';
import { PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './redis.factory';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { plainToInstance } from 'class-transformer';
import { User } from 'src/resources/user/entities/user.entity';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { generateHash, generateRandomUUID } from 'src/utils';
import { type EnvVariables } from 'config/env-variables';
import { BadRequestException } from '@nestjs/common';
import { INVALID_CACHE_KEY_FORMAT } from 'src/common/constants/error-messages';

describe(CacheService.name, () => {
  let service: CacheService;
  const mockLogger = createMock<PinoLogger>();
  const mockRedisClient = createMock<Redis>({
    get: vi.fn(),
  });
  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockReturnValue('development'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Dev environment:', () => {
    it('should clear cache and log on application bootstrap', async () => {
      await service.onApplicationBootstrap();

      expect(mockRedisClient.flushdb).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });

    it('should clear cache, log and quit redis client on application shutdown', async () => {
      await service.onApplicationShutdown();

      expect(mockRedisClient.flushdb).toHaveBeenCalledOnce();
      expect(mockRedisClient.quit).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });
  });

  it('should convert user auth info into string on insert', async () => {
    const mockUser = plainToInstance(User, {
      id: 'uuid1234',
      roles: [plainToInstance(Role, { role: UserRole.USER })],
      active: true,
    });
    const mockAuthInfo: CacheTokenValue = {
      userId: 'uuid1234',
      roles: [UserRole.USER],
      active: true,
      hash: '1234',
    };

    await service.insert(mockUser, mockAuthInfo.hash);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `user:${mockUser.id}`,
      JSON.stringify(mockAuthInfo),
    );
  });

  it('should throw if invalid user key format is used (uuid)', async () => {
    const mockAuthInfo: CacheTokenValue = {
      userId: 'uuid1234',
      roles: [UserRole.USER],
      active: true,
      hash: '1234',
    };
    const stringValue = JSON.stringify(mockAuthInfo);

    vi.spyOn(mockRedisClient, 'get').mockResolvedValue(stringValue);

    const result = service.getValue(mockAuthInfo.userId);

    await expect(async () => await result).rejects.toThrowWithMessage(
      BadRequestException,
      INVALID_CACHE_KEY_FORMAT,
    );
  });

  it('should convert user auth info into object on getting the key value', async () => {
    const mockAuthInfo: CacheTokenValue = {
      userId: generateRandomUUID(),
      roles: [UserRole.USER],
      active: true,
      hash: '1234',
    };
    const stringValue = JSON.stringify(mockAuthInfo);

    vi.spyOn(mockRedisClient, 'get').mockResolvedValue(stringValue);

    const result = await service.getValue(mockAuthInfo.userId);

    expect(result).toEqual(mockAuthInfo);
  });

  it('should return no info if key is not provided', async () => {
    vi.spyOn(mockRedisClient, 'get').mockResolvedValue(null);

    const result = await service.getValue(generateRandomUUID());

    expect(result).toEqual(null);
  });

  it('should get keys with "user:xxx" format', () => {
    const userId = generateRandomUUID();

    const result = service.getKey(userId);

    expect(result).toBe(`user:${userId}`);
  });

  it('should validate tokens by checking valid hashes', async () => {
    const check = 'uuid5678';
    const mockAuthInfo: CacheTokenValue = {
      userId: generateRandomUUID(),
      roles: [UserRole.USER],
      active: true,
      hash: await generateHash(check),
    };
    const stringValue = JSON.stringify(mockAuthInfo);

    vi.spyOn(mockRedisClient, 'get').mockResolvedValue(stringValue);

    const resultValid = await service.validate(mockAuthInfo.userId, check);
    const resultInvalid = await service.validate(
      mockAuthInfo.userId,
      'any-other-invalid-value',
    );

    expect(resultValid).toBe(true);
    expect(resultInvalid).toBe(false);
  });

  it('should return false if no value is found for a given key in the cache store', async () => {
    vi.spyOn(mockRedisClient, 'get').mockResolvedValue(null);

    const result = await service.validate(
      generateRandomUUID(),
      'something-something',
    );

    expect(result).toBe(false);
  });

  it('should invalidate keys by deleting from cache store', async () => {
    await service.invalidate('some-key');

    expect(mockRedisClient.del).toHaveBeenCalledExactlyOnceWith(
      'user:some-key',
    );
  });
});
