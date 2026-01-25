import { createMock } from '@golevelup/ts-vitest';
import { getUser, GetUser } from './get-user.decorator';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { INVALID_USER_FALLBACK } from 'src/common/constants/error-messages';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

describe(GetUser.name, () => {
  it('should throw if user is not found', () => {
    const mockExecutionContextWithoutUser = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: null,
        }),
      }),
    });

    expect(() =>
      getUser(undefined, mockExecutionContextWithoutUser),
    ).toThrowWithMessage(UnauthorizedException, INVALID_USER_FALLBACK);
  });

  it('should return user agent if no specific property is required', () => {
    const mockedUserAgent: RequestAgent = {
      id: 'uuid1234',
      active: true,
      roles: [UserRole.ADMIN],
    };
    const mockExecutionContextWithUser = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockedUserAgent,
        }),
      }),
    });

    const result = getUser(undefined, mockExecutionContextWithUser);

    expect(result).toEqual(mockedUserAgent);
  });

  it('should return specific user property requested', () => {
    const mockedUserAgent: RequestAgent = {
      id: 'uuid1234',
      active: true,
      roles: [UserRole.ADMIN],
    };
    const mockExecutionContextWithUser = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockedUserAgent,
        }),
      }),
    });

    const result1 = getUser('id', mockExecutionContextWithUser);
    const result2 = getUser('active', mockExecutionContextWithUser);
    const result3 = getUser('roles', mockExecutionContextWithUser);

    expect(result1).toEqual(mockedUserAgent.id);
    expect(result2).toEqual(mockedUserAgent.active);
    expect(result3).toEqual(mockedUserAgent.roles);
  });
});
