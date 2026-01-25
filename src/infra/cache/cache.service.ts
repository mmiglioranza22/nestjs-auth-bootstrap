import Redis from 'ioredis';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { type EnvVariables } from 'config/env-variables';
import { REDIS_CLIENT } from './redis.factory';
import { type UserAuthInfo } from 'src/resources/auth/interfaces/user-auth-info.interface';
import { User } from 'src/resources/user/entities/user.entity';
import { checkHash, getUserRolesList, isUUID } from 'src/utils';
import { INVALID_CACHE_KEY_FORMAT } from 'src/common/constants/error-messages';

export type CacheTokenValue = UserAuthInfo & { hash: string };

// ** Cache is mainly used for refresh token revalidation (so new access token are created and delivered without forcing logging in hourly)
// ** and JWT token check
@Injectable()
export class CacheService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    private readonly logger: PinoLogger,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    private readonly configService: ConfigService<EnvVariables>,
  ) {
    this.logger.setContext(CacheService.name);
  }
  async onApplicationBootstrap() {
    this.logger.info('Redis cache service bootstrap');
    await this._dropDatabase();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onApplicationShutdown(signal?: string) {
    this.logger.info('Redis client closing...');
    await this._dropDatabase();
    await this.redisClient.quit();
  }

  getKey(userId: string): string {
    return `user:${userId}`;
  }

  async getValue(userId: string): Promise<CacheTokenValue | null> {
    if (!isUUID(userId)) {
      throw new BadRequestException(INVALID_CACHE_KEY_FORMAT);
    }
    const stringValue = await this.redisClient.get(this.getKey(userId));
    return this.toObject(stringValue);
  }

  async insert(user: User, hash: string): Promise<void> {
    const authInfo: CacheTokenValue = {
      userId: user.id,
      roles: getUserRolesList(user.roles),
      active: user.active,
      hash,
    };
    await this.redisClient.set(this.getKey(user.id), this.stringify(authInfo));
  }

  // * Refresh token uses userId as key in cache, but has a random string in sub payload
  async validate(tokenKey: string, value: string): Promise<boolean> {
    const tokenPayload = await this.getValue(tokenKey);
    if (!tokenPayload) {
      return false;
    }
    return await checkHash(value, tokenPayload.hash);
  }

  async invalidate(userId: string): Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  async _dropDatabase() {
    if (this.isDev) {
      this.logger.info('Clearing cache...');
      await this.redisClient.flushdb();
      this.logger.info('Cache cleared');
    }
  }

  private get isDev() {
    return this.configService.getOrThrow('NODE_ENV') === 'development';
  }

  private stringify(authInfo: CacheTokenValue) {
    return JSON.stringify(authInfo);
  }

  private toObject(value?: string | null): CacheTokenValue | null {
    try {
      if (value) {
        return JSON.parse(value) as CacheTokenValue;
      } else {
        return null;
      }
    } catch (error: unknown) {
      this.logger.error(error);
      throw new InternalServerErrorException('Check cache service');
    }
  }
}
