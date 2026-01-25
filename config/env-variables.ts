import { LogLevel } from 'src/infra/logging/log-level/log-level.service';

// * Keep sync with env templates
export interface EnvVariables {
  NODE_ENV: 'development' | 'production' | 'local' | 'test' | 'staging';
  LOG_LEVEL: LogLevel;

  // DB
  PORT: number;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  // Shared with redis cache
  DB_RETRY_ATTEMPTS: number;
  DB_RETRY_DELAY: number;

  // AUTH
  JWT_TOKEN_AUDIENCE: string;
  JWT_TOKEN_ISSUER: string;
  JWT_ACCESS_TOKEN_SECRET: string;
  JWT_ACCESS_TOKEN_TTL: string;
  JWT_REFRESH_TOKEN_SECRET: string;
  JWT_REFRESH_TOKEN_TTL: string;
  COOKIE_MAX_AGE: number; // linked to refresh token ttl
  CSRF_SECRET: string;
  COOKIE_SECRET: string;

  // CACHE
  REDIS_STORE_URL: string;
  REDIS_STORE_HOST: string;
  REDIS_STORE_PORT: number;

  // MAIL
  MAILTRAP_HOST: string;
  MAILTRAP_PORT: number;
  MAILTRAP_USER: string;
  MAILTRAP_PASSWORD: string;
  MAIL_SENDER_ADDRESS: string;
  MAIL_SENDER_NAME: string;

  // OTP
  OTP_BASE_SECRET: string;
}
