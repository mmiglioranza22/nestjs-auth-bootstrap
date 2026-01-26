import { createMock } from '@golevelup/ts-vitest';
import { UserRoleGuard } from './user-role.guard';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { Private } from '../private/private.decorator';
import { RoleProtected } from 'src/resources/auth/decorators/role-protected/role-protected.decorator';
import { Reflector } from '@nestjs/core';
import {
  CacheService,
  type CacheTokenValue,
} from 'src/infra/cache/cache.service';
import {
  ROLE_GUARD_FORBIDDEN,
  ROLE_GUARD_UNAUTHORIZED_USER,
} from 'src/common/constants/error-messages';

describe(UserRoleGuard.name, () => {
  let guard: UserRoleGuard;
  const mockReflector = createMock<Reflector>({
    get: vi.fn(),
  });
  const mockCacheService = createMock<CacheService>({
    getValue: vi.fn(),
  });
  const mockUser: RequestAgent = {
    id: 'uuid1234',
    active: true,
    roles: [UserRole.ADMIN],
  };
  const mockExecutionContextWithUser = createMock<ExecutionContext>({
    getHandler: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: mockUser,
      }),
    }),
  });

  beforeEach(() => {
    guard = new UserRoleGuard(mockReflector, mockCacheService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it(`should return false of no valid roles are provided (no value, undefined) - ${RoleProtected.name} decorator not implemented`, async () => {
    // Spy on validRoles
    vi.spyOn(mockReflector, 'get').mockReturnValue(undefined);

    const result = await guard.canActivate(mockExecutionContextWithUser);

    expect(result).toBe(false);
  });

  it(`should return false if no valid roles are found (empty list) - ${RoleProtected.name} decorator implemented with incorrect values`, async () => {
    // Spy on validRoles
    vi.spyOn(mockReflector, 'get').mockReturnValue([]);

    const result = await guard.canActivate(mockExecutionContextWithUser);

    expect(result).toBe(false);
  });

  it(`should throw no user is found in request (usage with ${Private.name} decorator)`, async () => {
    // bypass validRoles tests
    vi.spyOn(mockReflector, 'get').mockReturnValue([UserRole.ADMIN]);

    vi.spyOn(mockCacheService, 'getValue').mockResolvedValue(null);

    try {
      await guard.canActivate(mockExecutionContextWithUser);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchObject({ message: ROLE_GUARD_UNAUTHORIZED_USER });
    }
  });

  it(`should throw if user does not have required roles`, async () => {
    const requiredRole = [UserRole.SYS_ADMIN];
    const userRoles = [UserRole.USER];
    const mockCacheTokenValue: CacheTokenValue = {
      userId: 'uuid1234',
      active: true,
      hash: 'some hash',
      roles: userRoles,
    };
    // Spy on validRoles: pass valid role
    vi.spyOn(mockReflector, 'get').mockReturnValue(requiredRole);
    vi.spyOn(mockCacheService, 'getValue').mockResolvedValue(
      mockCacheTokenValue,
    );

    try {
      await guard.canActivate(mockExecutionContextWithUser);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error).toMatchObject({ message: ROLE_GUARD_FORBIDDEN });
    }
  });

  it('should return true if user has the required roles', async () => {
    const mockCacheTokenValue: CacheTokenValue = {
      userId: mockUser.id,
      active: mockUser.active,
      roles: mockUser.roles,
      hash: 'some hash',
    };
    vi.spyOn(mockReflector, 'get').mockReturnValue(mockUser.roles);
    vi.spyOn(mockCacheService, 'getValue').mockResolvedValue(
      mockCacheTokenValue,
    );

    const result = await guard.canActivate(mockExecutionContextWithUser);

    expect(result).toBe(true);
  });
});
