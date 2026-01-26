import { Redis } from 'ioredis';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisFactory: FactoryProvider<Redis> = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<EnvVariables>) => {
    const redisInstance = new Redis({
      lazyConnect: configService.get('NODE_ENV') === 'test',
      host: configService.getOrThrow('REDIS_STORE_HOST', {
        infer: true,
      }),
      port: configService.getOrThrow('REDIS_STORE_PORT', { infer: true }),
      keyPrefix: '',
      connectTimeout: 10000,
      keepAlive: 1000,
      showFriendlyErrorStack: true, // * Can be disabled for production
      autoResendUnfulfilledCommands: false,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        console.log('RETRIES', times);
        // Max 10 retries
        if (times > 10) {
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000); // Exponential backoff up to 2 seconds
        const jitter = Math.random() * 100; // Add up to 100ms of jitter
        console.log(
          `Retrying connection in ${delay + jitter}ms (attempt ${times})...`,
        );

        return delay + jitter;
      },
    });

    return redisInstance;
  },
};
