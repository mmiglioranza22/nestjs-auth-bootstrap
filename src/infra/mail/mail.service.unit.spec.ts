/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import nodemailer from 'nodemailer';
vi.mock('nodemailer', { spy: true });

import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';

import { plainToInstance } from 'class-transformer';
import { User } from 'src/resources/user/entities/user.entity';
import { OtpAuthenticationService } from 'src/resources/auth/modules/otp/otp-authentication.service';
import { Mock } from 'vitest';

// ? Tests here only focus on transporter

describe(MailService.name, () => {
  let service: MailService;

  const mockConfigService = createMock<ConfigService<EnvVariables>>({
    getOrThrow: vi.fn().mockImplementation((variable) => {
      switch (variable) {
        case 'MAILTRAP_HOST':
          return 'test';
        case 'MAILTRAP_PORT':
          return 2525;
        case 'MAILTRAP_USER':
        case 'MAILTRAP_PASSWORD':
          return 'some-string';
      }
    }),
  });
  const mockOtpCode = '123456';
  const mockOtpService = createMock<OtpAuthenticationService>({
    generateCode: vi.fn().mockResolvedValue(mockOtpCode),
  });
  const mockSendMail = vi.fn().mockResolvedValue('mock info');
  const mockCreateTransport = nodemailer.createTransport as unknown as Mock;

  beforeEach(async () => {
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OtpAuthenticationService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send recovery token', async () => {
    const mockUser = plainToInstance(User, {
      email: 'hello@demomailtrap.co',
      username: 'Mailtrap test',
    });

    await service.sendRecoveryToken(mockUser.email, 'recovery');

    expect(
      nodemailer.createTransport().sendMail,
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        html: expect.stringContaining('recovery'),
      }),
    );
  });

  it('should send account verification token', async () => {
    const mockUser = plainToInstance(User, {
      email: 'hello@demomailtrap.co',
      username: 'Mailtrap test',
    });

    await service.sendAccountVerification(mockUser.email);

    expect(
      nodemailer.createTransport().sendMail,
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        html: expect.stringContaining(mockOtpCode),
      }),
    );
  });

  it('should send user invitation', async () => {
    const mockUser = plainToInstance(User, {
      email: 'hello@demomailtrap.co',
      username: 'Mailtrap test',
    });

    await service.sendUserInvitation(mockUser.email, '123token123');

    expect(
      nodemailer.createTransport().sendMail,
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        html: expect.stringContaining('123token123'),
      }),
    );
  });

  it('should send changed email verification', async () => {
    const mockUser = plainToInstance(User, {
      email: 'hello@demomailtrap.co',
      username: 'Mailtrap test',
    });

    await service.sendChangeEmailVerification(mockUser.email, '123token123');

    expect(
      nodemailer.createTransport().sendMail,
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        html: expect.stringContaining('123token123'),
      }),
    );
  });
});
