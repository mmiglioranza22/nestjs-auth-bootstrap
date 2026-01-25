import { PickType } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';

export class QuestUserResponseDTO extends PickType(UserResponseDTO, [
  'id',
  'name',
  'username',
  'active',
] as const) {}
