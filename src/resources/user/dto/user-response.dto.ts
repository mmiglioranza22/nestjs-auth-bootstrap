import { OmitType } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserResponseDTO extends OmitType(User, ['hash'] as const) {}
