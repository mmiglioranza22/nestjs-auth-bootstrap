import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';
import {
  generate,
  OTPGenerateOptions,
  OTPVerifyOptions,
  verify,
  VerifyResult,
} from 'otplib';

// * Current use: account verification (to avoid sending user id via email)
// ? Can be extended to support 2FA login
@Injectable()
export class OtpAuthenticationService {
  private readonly otpOptions: OTPVerifyOptions | OTPGenerateOptions;
  constructor(private readonly configService: ConfigService<EnvVariables>) {
    this.otpOptions = {
      secret: configService.getOrThrow('OTP_BASE_SECRET', { infer: true }),
      algorithm: 'sha256',
      period: 60 * 60,
    };
  }

  async generateCode(): Promise<string> {
    const token = await generate(this.otpOptions);
    return token;
  }

  async verifyCode(code: string): Promise<VerifyResult> {
    const response = await verify({
      token: code,
      ...this.otpOptions,
    });
    return response as VerifyResult;
  }
}
