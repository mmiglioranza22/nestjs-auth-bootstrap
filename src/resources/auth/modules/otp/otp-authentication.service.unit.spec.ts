import { Test, TestingModule } from '@nestjs/testing';
import { OtpAuthenticationService } from './otp-authentication.service';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-vitest';

describe(OtpAuthenticationService.name, () => {
  let service: OtpAuthenticationService;
  const mockConfigService = createMock<ConfigService>({
    getOrThrow: vi.fn().mockReturnValue('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), //base32 encoded
  });
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpAuthenticationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OtpAuthenticationService>(OtpAuthenticationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate 6 number code', async () => {
    const code = await service.generateCode();

    expect(code.length).toBe(6);
    expect(/^\d+$/.test(code)).toBe(true);
  });

  it('should verify codes generated correctly', async () => {
    const code = await service.generateCode();

    const result = await service.verifyCode(code);

    expect(result.valid).toBe(true);
  });

  it('should verify and fail codes not generated correctly', async () => {
    const result = await service.verifyCode('123456');

    expect(result.valid).toBe(false);
  });
});
