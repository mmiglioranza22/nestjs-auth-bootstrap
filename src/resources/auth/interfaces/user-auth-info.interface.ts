import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

export interface UserAuthInfo {
  userId: string;
  roles: UserRole[];
  active: boolean;
}
