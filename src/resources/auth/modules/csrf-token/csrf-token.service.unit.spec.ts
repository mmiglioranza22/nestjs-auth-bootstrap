import crypto from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { CsrfTokenService } from './csrf-token.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';

describe(CsrfTokenService.name, () => {
  let service: CsrfTokenService;
  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockReturnValue('super-secret'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfTokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CsrfTokenService>(CsrfTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCsrfToken', () => {
    it('should generate a token with a valid format', () => {
      const token = service.generateCsrfToken();

      const parts = token.split('.');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(parts[1]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const t1 = service.generateCsrfToken();
      const t2 = service.generateCsrfToken();

      expect(t1).not.toEqual(t2);
    });
  });

  describe('verifyCsrfToken', () => {
    it('should validate a correctly signed token', () => {
      const token = service.generateCsrfToken();
      expect(service.verifyCsrfToken(token)).toBe(true);
    });

    it('should reject a token with a modified payload', () => {
      const token = service.generateCsrfToken();
      const [payload, sig] = token.split('.');
      const tampered = `deadbeef${payload.slice(8)}.${sig}`;

      expect(service.verifyCsrfToken(tampered)).toBe(false);
    });

    it('should reject a token with a modified signature', () => {
      const token = service.generateCsrfToken();
      const [payload] = token.split('.');
      const badSig = crypto.randomBytes(32).toString('hex');

      expect(service.verifyCsrfToken(`${payload}.${badSig}`)).toBe(false);
    });

    it('should reject malformed tokens', () => {
      expect(service.verifyCsrfToken('')).toBe(false);
      expect(service.verifyCsrfToken('abc')).toBe(false);
      expect(service.verifyCsrfToken('a.b.c')).toBe(false);
    });
  });
});
