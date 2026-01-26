import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { META_ROLES, RoleProtected } from './role-protected.decorator';
import { SetMetadata } from '@nestjs/common';

vi.mock('@nestjs/common', () => ({
  SetMetadata: vi.fn(),
}));

describe(RoleProtected.name, () => {
  it('should be called with correct arguments', () => {
    const roles = [UserRole.SYS_ADMIN, UserRole.ADMIN, UserRole.USER];

    RoleProtected(...roles);

    expect(SetMetadata).toHaveBeenCalledExactlyOnceWith(META_ROLES, roles);
  });
});
