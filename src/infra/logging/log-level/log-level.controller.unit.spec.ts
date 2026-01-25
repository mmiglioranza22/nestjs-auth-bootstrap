/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LogLevelController } from './log-level.controller';
import { createMock } from '@golevelup/ts-vitest';
import { CacheService } from 'src/infra/cache/cache.service';
import { CsrfTokenService } from 'src/resources/auth/modules/csrf-token/csrf-token.service';
import { LogLevelService } from './log-level.service';

describe(LogLevelController.name, () => {
  let controller: LogLevelController;
  // deps used by guards
  const mockCacheService = createMock<CacheService>(); // UserRoleGuard
  const mockCsrfService = createMock<CsrfTokenService>(); // CsrfGuard
  const mockLogLevelService = createMock<LogLevelService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogLevelController],
      providers: [
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CsrfTokenService,
          useValue: mockCsrfService,
        },
        {
          provide: LogLevelService,
          useValue: mockLogLevelService,
        },
      ],
    }).compile();

    controller = module.get<LogLevelController>(LogLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get log level', () => {
    controller.getLevel();

    expect(mockLogLevelService.getLevel).toHaveBeenCalledOnce();
  });

  it('should set log level', () => {
    const debug = 'debug';

    controller.setLevel(debug);

    expect(mockLogLevelService.setLevel).toHaveBeenCalledExactlyOnceWith(debug);
  });
});
