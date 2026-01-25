import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/resources/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from 'src/infra/mail/mail.module';
import { type EnvVariables } from 'config/env-variables';
import { RecoveryTokenModule } from 'src/resources/auth/modules/recovery-token/recovery-token.module';
import { CacheModule } from 'src/infra/cache/cache.module';
import { CsrfTokenService } from './modules/csrf-token/csrf-token.service';
import { CsrfTokenModule } from './modules/csrf-token/csrf-token.module';
import { OtpAuthenticationService } from './modules/otp/otp-authentication.service';
import { OtpAuthenticationModule } from './modules/otp/otp-authentication.module';

@Global()
@Module({
  imports: [
    RecoveryTokenModule,
    UserModule,
    CacheModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVariables>) => {
        return {
          secret: configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
          signOptions: {
            expiresIn: configService.getOrThrow('JWT_ACCESS_TOKEN_TTL'),
            audience: configService.getOrThrow('JWT_TOKEN_AUDIENCE'),
            issuer: configService.getOrThrow('JWT_TOKEN_ISSUER'),
          },
        };
      },
    }),
    MailModule,
    CsrfTokenModule,
    OtpAuthenticationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    CsrfTokenService,
    OtpAuthenticationService,
  ],
  exports: [AuthService, JwtModule, JwtStrategy, PassportModule, CacheModule],
})
export class AuthModule {}
