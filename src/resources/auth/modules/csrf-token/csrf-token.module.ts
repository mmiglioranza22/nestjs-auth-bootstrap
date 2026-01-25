import { Module, Global } from '@nestjs/common';
import { CsrfTokenService } from './csrf-token.service';

@Global()
@Module({
  providers: [CsrfTokenService],
  exports: [CsrfTokenService],
})
export class CsrfTokenModule {}
