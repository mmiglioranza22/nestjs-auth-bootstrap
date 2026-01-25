import { User } from 'src/resources/user/entities/user.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

export type RequestAgent = Pick<User, 'id' | 'active'> & { roles: UserRole[] };
