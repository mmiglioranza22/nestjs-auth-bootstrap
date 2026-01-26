import { createMock } from '@golevelup/ts-vitest';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { type EnvVariables } from 'config/env-variables';

import { JwtStrategy } from './jwt.strategy';
import { type JwtPayload } from '../interfaces/jwt-payload.interface';

describe(JwtService.name, () => {
  let strategy: JwtStrategy;

  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: () => 'SECRET',
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,

        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return user id from token payload', () => {
    const userId = 'uuid1234';
    const jwtPayload: JwtPayload = {
      sub: userId,
    };

    const result = strategy.validate(jwtPayload);

    expect(result).toBe(userId);
  });
});
