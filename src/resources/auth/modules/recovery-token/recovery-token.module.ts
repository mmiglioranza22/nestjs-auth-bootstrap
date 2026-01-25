import { Module } from '@nestjs/common';
import { RecoveryTokenService } from './recovery-token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoveryToken } from './entities/recover-credentials-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecoveryToken])],
  providers: [RecoveryTokenService],
  exports: [RecoveryTokenService],
})
export class RecoveryTokenModule {}
