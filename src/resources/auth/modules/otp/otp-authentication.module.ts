import { Module, Global } from '@nestjs/common';
import { OtpAuthenticationService } from './otp-authentication.service';

@Global()
@Module({
  providers: [OtpAuthenticationService],
  exports: [OtpAuthenticationService],
})
export class OtpAuthenticationModule {}
