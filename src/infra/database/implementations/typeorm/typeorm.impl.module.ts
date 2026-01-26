import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type EnvVariables } from 'config/env-variables';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVariables>) => {
        return {
          type: 'postgres',
          host: configService.getOrThrow('DB_HOST', { infer: true }),
          port: configService.getOrThrow('DB_PORT', { infer: true }),
          database: configService.getOrThrow('DB_NAME', { infer: true }),
          username: configService.getOrThrow('DB_USERNAME', { infer: true }),
          password: configService.getOrThrow('DB_PASSWORD', { infer: true }),
          autoLoadEntities: true,
          synchronize: configService.getOrThrow('NODE_ENV') !== 'production', // * for production should be false and migrate manually
          dropSchema: configService.getOrThrow('NODE_ENV') !== 'production',
          useUTC: true,
          // * This should be considered with your production environment capabilities
          retryAttempts: configService.getOrThrow('DB_RETRY_ATTEMPTS', {
            infer: true,
          }),
          retryDelay: configService.getOrThrow('DB_RETRY_DELAY', {
            infer: true,
          }),
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmImplModule {}
