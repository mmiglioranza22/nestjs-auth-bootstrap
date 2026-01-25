// https://github.com/charbelh3/nestjs-auth-apis/blob/main/src/services/mail.service.ts
// https://www.youtube.com/watch?v=Pu1YP5PZKFc
// https://www.youtube.com/watch?v=Pu1YP5PZKFc&t=9s
// https://mailtrap.io/home

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import { type EnvVariables } from 'config/env-variables';
import { OtpAuthenticationService } from 'src/resources/auth/modules/otp/otp-authentication.service';

// ? Service too tighly coupled to nodemailer implementation
@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  constructor(
    private readonly configService: ConfigService<EnvVariables>,
    private readonly otpService: OtpAuthenticationService,
  ) {
    // Sandbox integration
    this.transporter = createTransport({
      host: configService.getOrThrow('MAILTRAP_HOST', { infer: true }),
      port: configService.getOrThrow('MAILTRAP_PORT', { infer: true }),
      auth: {
        user: configService.getOrThrow('MAILTRAP_USER', { infer: true }),
        pass: configService.getOrThrow('MAILTRAP_PASSWORD', {
          infer: true,
        }),
      },
    });
  }

  async sendAccountVerification(to: string) {
    const sender = {
      address: this.configService.getOrThrow('MAIL_SENDER_ADDRESS', {
        infer: true,
      }),
      name: this.configService.getOrThrow('MAIL_SENDER_NAME', {
        infer: true,
      }),
    };

    const recipients = [to];

    if (!this.isProd) {
      recipients[0] = 'test-recipient@mail.com';
    }

    const otpCode = await this.otpService.generateCode();

    const mailOptions: SendMailOptions = {
      from: sender,
      to: recipients,
      subject: 'Sign up confirmation',
      html: `<p>You signed up with this email. Use this code to verify your account: ${otpCode}.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendRecoveryToken(to: string, token: string) {
    const sender = {
      address: this.configService.getOrThrow('MAIL_SENDER_ADDRESS', {
        infer: true,
      }),
      name: this.configService.getOrThrow('MAIL_SENDER_NAME', {
        infer: true,
      }),
    };

    const recipients = [to];

    if (!this.isProd) {
      recipients[0] = 'test-recipient@mail.com';
    }
    const mailOptions: SendMailOptions = {
      from: sender,
      to: recipients,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Use this token to recover your credentials: ${token}</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // * Not used *
  async sendUserInvitation(to: string, userId: string) {
    const sender = {
      address: this.configService.getOrThrow('MAIL_SENDER_ADDRESS', {
        infer: true,
      }),
      name: this.configService.getOrThrow('MAIL_SENDER_NAME', {
        infer: true,
      }),
    };

    const recipients = [to];

    if (!this.isProd) {
      recipients[0] = 'test-recipient@mail.com';
    }
    const confirmLink = `http://frontend.app.url.to.redirect.from.and.read.token.query/auth/signup?token=${userId}`;
    const mailOptions: SendMailOptions = {
      from: sender,
      to: recipients,
      subject: 'Invitation',
      html: `<p>You've been invited to form part of an organization. Click the link below to confirm sign up $:</p><p><a href="${confirmLink}">Verify Email</a></p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // * Not used *
  async sendChangeEmailVerification(to: string, userId: string) {
    const sender = {
      address: this.configService.getOrThrow('MAIL_SENDER_ADDRESS', {
        infer: true,
      }),
      name: this.configService.getOrThrow('MAIL_SENDER_NAME', {
        infer: true,
      }),
    };

    const recipients = [to];

    if (!this.isProd) {
      recipients[0] = 'test-recipient@mail.com';
    }

    const confirmLink = `http://frontend.app.url.to.redirect.from.and.read.token.query/change-email?token=${userId}`;
    const mailOptions: SendMailOptions = {
      from: sender,
      to: recipients,
      subject: 'Confirm email change',
      html: `<p>You modified your email. Click the link below to validate new email $:</p><p><a href="${confirmLink}">Verify Email</a></p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  private get isProd() {
    return this.configService.getOrThrow('NODE_ENV') === 'production';
  }
}
