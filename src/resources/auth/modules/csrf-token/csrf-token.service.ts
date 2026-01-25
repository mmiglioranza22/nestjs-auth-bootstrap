import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';

// ? csrf-csrf solution would render this service unnecessary, yet requires request middleware to set request id
@Injectable()
export class CsrfTokenService {
  constructor(private readonly configService: ConfigService<EnvVariables>) {}

  generateCsrfToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    const signature = this.sign(token);
    return `${token}.${signature}`;
  }

  verifyCsrfToken(value: string): boolean {
    const [token, signature] = value.split('.');
    if (!token || !signature) {
      return false;
    }

    const expected = this.sign(token);
    return this.safeEqualCompare(signature, expected);
  }

  private sign(token: string): string {
    return crypto
      .createHmac(
        'sha256',
        this.configService.getOrThrow('CSRF_SECRET', {
          infer: true,
        }),
      )
      .update(token)
      .digest('hex');
  }

  // If the strings have different lengths, you should ideally compare them to a "dummy" string or hash both before comparing to avoid leaking the actual length of the secret.
  private safeEqualCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Perform a dummy comparison to mitigate some timing variance to avoid leaking different lengths
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }
}
