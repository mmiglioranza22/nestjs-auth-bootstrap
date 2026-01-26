import { Request } from 'express';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
} from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './infra/database/database.module';
import { UserModule } from './resources/user/user.module';
import { AuthModule } from './resources/auth/auth.module';
import { SeedModule } from './_seed/seed.module';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';

import { CacheModule } from './infra/cache/cache.module';
import { generateRandomUUID } from './utils';
import { LoggerModule } from './infra/logging/logger.module';
import { EnvVariables } from 'config/env-variables';

const CONFIG_MODULE_OPTIONS: Record<string, ConfigModuleOptions> = {
  development: {
    ignoreEnvFile: true, // Let dotenvx handle the environment loading
  },
  production: { ignoreEnvFile: true },
  test: {
    envFilePath: './config/.env.test',
  },
  ci: {
    envFilePath: './config/.env.test',
  },
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ...CONFIG_MODULE_OPTIONS[`${process.env.NODE_ENV}`],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVariables>) => {
        const isProd =
          configService.getOrThrow('NODE_ENV', { infer: true }) ===
          'production';
        return {
          throttlers: [
            isProd
              ? {
                  limit: 4,
                  ttl: seconds(10),
                }
              : { limit: 50, ttl: seconds(0) }, // * testing bypass, should be tested separatedly with specific prod config
          ],
        };
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        idGenerator: (req: Request) => generateRandomUUID(),
      },
    }),
    LoggerModule,
    DatabaseModule,
    UserModule,
    SeedModule,
    AuthModule,
    CacheModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionsFilter,
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
