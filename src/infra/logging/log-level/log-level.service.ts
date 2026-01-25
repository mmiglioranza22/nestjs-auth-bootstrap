import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

@Injectable()
export class LogLevelService {
  constructor(private readonly logger: PinoLogger) {}

  setLevel(level: LogLevel) {
    this.logger.logger.level = level;
  }

  getLevel(): LogLevel {
    return this.logger.logger.level as LogLevel;
  }
}
