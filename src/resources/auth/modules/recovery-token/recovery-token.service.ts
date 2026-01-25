import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RecoveryToken } from './entities/recover-credentials-token.entity';
import { calculateFutureUTCDate, generateRandomUUID } from 'src/utils';

@Injectable()
export class RecoveryTokenService {
  constructor(
    @InjectRepository(RecoveryToken)
    private readonly recoveryTokenRepository: Repository<RecoveryToken>,
  ) {}

  async getRecoveryToken(token: string): Promise<RecoveryToken | null> {
    return await this.recoveryTokenRepository.findOne({
      where: { token },
    });
  }

  async createRecoveryToken(userId: string): Promise<string> {
    const token = generateRandomUUID();
    const recoveryToken = this.recoveryTokenRepository.create({
      token,
      userId,
      expiresAt: calculateFutureUTCDate(24),
    });

    await this.recoveryTokenRepository.save(recoveryToken);
    return recoveryToken.token;
  }

  async removeUserRecoveryTokens(userId: string) {
    const tokens = await this.recoveryTokenRepository.find({
      where: { userId },
    });

    if (tokens && tokens.length > 0) {
      await Promise.all(
        tokens.map((token) => this.recoveryTokenRepository.delete(token.id)),
      );
    }
  }
}
