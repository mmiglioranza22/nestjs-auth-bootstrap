/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryTokenService } from './recovery-token.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RecoveryToken } from './entities/recover-credentials-token.entity';
import { type EnvVariables } from 'config/env-variables';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';

describe(RecoveryTokenService.name, () => {
  let service: RecoveryTokenService;
  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockReturnValue(24),
  });
  const mockRecoveryTokenRepository = createMock<Repository<RecoveryToken>>({
    find: vi.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryTokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(RecoveryToken),
          useValue: mockRecoveryTokenRepository,
        },
      ],
    }).compile();

    service = module.get<RecoveryTokenService>(RecoveryTokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create recovery token', async () => {
    const userId = 'uuid1234';

    await service.createRecoveryToken(userId);

    expect(mockRecoveryTokenRepository.create).toHaveBeenCalledExactlyOnceWith({
      token: expect.any(String),
      userId,
      expiresAt: expect.any(Date),
    });
    expect(mockRecoveryTokenRepository.save).toHaveBeenCalledOnce();
  });

  it('should retrieve recovery token from database', async () => {
    const token = 'recovery-token';

    await service.getRecoveryToken(token);

    expect(mockRecoveryTokenRepository.findOne).toHaveBeenCalledExactlyOnceWith(
      { where: { token } },
    );
  });

  it('should remove user recovery tokens from database if they exist', async () => {
    const userId = 'uuid1234';
    const tokenId = 'token-id-to-be-deleted';
    vi.spyOn(mockRecoveryTokenRepository, 'find').mockResolvedValue([
      plainToInstance(RecoveryToken, { id: tokenId }),
    ]);

    await service.removeUserRecoveryTokens(userId);

    expect(mockRecoveryTokenRepository.find).toHaveBeenCalledExactlyOnceWith({
      where: { userId },
    });
    expect(mockRecoveryTokenRepository.delete).toHaveBeenCalledExactlyOnceWith(
      tokenId,
    );
  });
});
