import { Test, TestingModule } from '@nestjs/testing';
import { LogLevelService } from './log-level.service';
import { PinoLogger } from 'nestjs-pino';
import { createMock } from '@golevelup/ts-vitest';

describe(LogLevelService.name, () => {
  let service: LogLevelService;

  beforeEach(async () => {
    const mockLogger = createMock<PinoLogger>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogLevelService,
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LogLevelService>(LogLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to change log level at runtime', () => {
    const fatal = 'fatal';
    const debug = 'debug';

    service.setLevel(fatal);
    expect(service.getLevel()).toBe(fatal);

    service.setLevel(debug);
    expect(service.getLevel()).toBe(debug);
  });
});
