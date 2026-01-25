import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import {
  checkAllowedActionOn_User,
  getUserRolesList,
  checkAllowed_User_UpdateAction,
  generateRandomUUID,
  checkAllowed_User_CreateAction,
} from '.';

import { plainToInstance } from 'class-transformer';
import { User } from 'src/resources/user/entities/user.entity';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';

import {
  ROLES_ALLOWED_FOR_ADMINS,
  ROLES_NOT_ALLOWED_FOR_ADMINS,
} from 'src/common/constants/allowed-user-roles-updates';

const TrueResult = true;
const FalseResult = false;

describe('Utils', () => {
  describe(getUserRolesList.name, () => {
    it('should receive a Role list and return the specific UserRole enum array', () => {
      const userRole = new Role();
      userRole.role = UserRole.USER;
      const roles = [userRole];

      const result = getUserRolesList(roles);

      expect(result).toContain(UserRole.USER);
    });
  });

  // ** USER RELATED CHECKS

  describe('User related logic:', () => {
    describe(checkAllowedActionOn_User.name, () => {
      describe('Allowed actions results:', () => {
        describe('While agent IS active', () => {
          it(`should return ${TrueResult} if agent role is "${UserRole.SYS_ADMIN}"`, () => {
            const user = plainToInstance(User, {
              roles: [plainToInstance(Role, { role: UserRole.GUEST })],
            });
            const sysadminAgent: RequestAgent = {
              id: generateRandomUUID(),
              active: true,
              roles: [UserRole.SYS_ADMIN],
            };

            const result = checkAllowedActionOn_User(user, sysadminAgent);

            expect(result).toBe(TrueResult);
          });
        });

        it(`should return ${TrueResult} if agent role is "${UserRole.ADMIN}" and user to be updated does not have the same role nor "${UserRole.SYS_ADMIN}" role`, () => {
          const simpleRoleUser = plainToInstance(User, {
            roles: [plainToInstance(Role, { role: UserRole.USER })],
          });
          const adminAgent: RequestAgent = {
            id: generateRandomUUID(),
            active: true,
            roles: [UserRole.ADMIN],
          };

          const result = checkAllowedActionOn_User(simpleRoleUser, adminAgent);

          expect(result).toBe(TrueResult);
        });

        it(`should return ${TrueResult} if the agent performs the action to himself, regardless of role`, () => {
          const userId = 'uuid1234';
          const guestRole = UserRole.GUEST;
          const userRole = UserRole.USER;
          const adminRole = UserRole.ADMIN;

          const guestUser = plainToInstance(User, {
            id: userId,
            roles: [plainToInstance(Role, { role: guestRole })],
          });
          const guestAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [guestRole],
          };

          const plainUser = plainToInstance(User, {
            id: userId,
            roles: [plainToInstance(Role, { role: userRole })],
          });
          const userAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [userRole],
          };

          const adminUser = plainToInstance(User, {
            id: userId,
            roles: [plainToInstance(Role, { role: adminRole })],
          });
          const adminAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [adminRole],
          };

          const result1 = checkAllowedActionOn_User(guestUser, guestAgent);
          const result2 = checkAllowedActionOn_User(plainUser, userAgent);
          const result3 = checkAllowedActionOn_User(adminUser, adminAgent);

          expect(result1).toBe(TrueResult);
          expect(result2).toBe(TrueResult);
          expect(result3).toBe(TrueResult);
        });
      });

      describe('Not allowed actions results:', () => {
        it(`should return ${FalseResult} if agent is not active`, () => {
          const plainUser = plainToInstance(User, {
            roles: [plainToInstance(Role, { role: UserRole.USER })],
          });
          const inactiveAdminAgent: RequestAgent = {
            id: generateRandomUUID(),
            active: false,
            roles: [UserRole.SYS_ADMIN],
          };

          const result = checkAllowedActionOn_User(
            plainUser,
            inactiveAdminAgent,
          );

          expect(result).toBe(FalseResult);
        });

        it(`should return ${FalseResult} if agent role is "${UserRole.ADMIN}" and user to be updated too`, () => {
          const adminRole = UserRole.ADMIN;
          const adminUser = plainToInstance(User, {
            roles: [plainToInstance(Role, { role: adminRole })],
          });
          const adminAgent: RequestAgent = {
            id: generateRandomUUID(),
            active: true,
            roles: [adminRole],
          };

          const result = checkAllowedActionOn_User(adminUser, adminAgent);

          expect(result).toBe(FalseResult);
        });

        it(`should return ${FalseResult} if agent role is "${UserRole.ADMIN}" and user to be updated has a higher privilege role`, () => {
          const sysadminUser = plainToInstance(User, {
            roles: [plainToInstance(Role, { role: UserRole.SYS_ADMIN })],
          });
          const adminAgent: RequestAgent = {
            id: generateRandomUUID(),
            active: true,
            roles: [UserRole.ADMIN],
          };

          const result = checkAllowedActionOn_User(sysadminUser, adminAgent);

          expect(result).toBe(FalseResult);
        });

        it(`should return ${FalseResult} if agent role is "${UserRole.GUEST}" and user to be updated has any other role`, () => {
          const sysadminUser = plainToInstance(User, {
            roles: [plainToInstance(Role, { role: UserRole.SYS_ADMIN })],
          });
          const guestAgent: RequestAgent = {
            id: generateRandomUUID(),
            active: true,
            roles: [UserRole.GUEST],
          };

          const result = checkAllowedActionOn_User(sysadminUser, guestAgent);

          expect(result).toBe(FalseResult);
        });
      });
    });

    describe(checkAllowed_User_UpdateAction.name, () => {
      // TODO Fix mock import issue
      it.skip(`should delegate conditions check to "${checkAllowedActionOn_User.name}" function if no roles are to be modified`, () => {
        const guestUser = plainToInstance(User, {
          roles: [plainToInstance(Role, { role: UserRole.GUEST })],
        });
        const sysadminAgent: RequestAgent = {
          id: generateRandomUUID(),
          active: true,
          roles: [UserRole.SYS_ADMIN],
        };

        checkAllowed_User_UpdateAction(guestUser, sysadminAgent);

        expect(checkAllowedActionOn_User).toHaveBeenCalledOnce();
        expect(checkAllowedActionOn_User).toHaveBeenCalledWith(
          guestUser,
          sysadminAgent,
        );
      });

      describe('While updating user roles:', () => {
        describe('Allowed actions results:', () => {
          describe('While agent IS active', () => {
            describe('While applying role update to other user', () => {
              it(`should return ${TrueResult} if agent role is "${UserRole.SYS_ADMIN}"`, () => {
                const guestUser = plainToInstance(User, {
                  roles: [plainToInstance(Role, { role: UserRole.GUEST })],
                });
                const sysadminAgent: RequestAgent = {
                  id: generateRandomUUID(),
                  active: true,
                  roles: [UserRole.SYS_ADMIN],
                };

                const result = checkAllowed_User_UpdateAction(
                  guestUser,
                  sysadminAgent,
                  [UserRole.SYS_ADMIN],
                );

                expect(result).toBe(TrueResult);
              });

              it(`should return ${TrueResult} if agent role is "${UserRole.ADMIN}" and new role for user is allowed (NOT "${UserRole.SYS_ADMIN}")`, () => {
                const guestUser = plainToInstance(User, {
                  roles: [plainToInstance(Role, { role: UserRole.GUEST })],
                });
                const adminAgent: RequestAgent = {
                  id: generateRandomUUID(),
                  active: true,
                  roles: [UserRole.ADMIN],
                };

                const results = ROLES_ALLOWED_FOR_ADMINS.map((role) => {
                  return checkAllowed_User_UpdateAction(guestUser, adminAgent, [
                    role,
                  ]);
                });

                results.every((result) => expect(result).toBe(TrueResult));
              });
            });

            describe('While applying role update to himself', () => {
              it(`should return ${TrueResult} if agent role is "${UserRole.ADMIN}" and new intended role is allowed (NOT "${UserRole.SYS_ADMIN}")`, () => {
                const userId = 'uuid1234';
                const adminRole = UserRole.ADMIN;
                const adminUser = plainToInstance(User, {
                  id: userId,
                  roles: [plainToInstance(Role, { role: adminRole })],
                });
                const adminAgent: RequestAgent = {
                  id: userId,
                  active: true,
                  roles: [adminRole],
                };

                const results = ROLES_ALLOWED_FOR_ADMINS.map((role) => {
                  return checkAllowed_User_UpdateAction(adminUser, adminAgent, [
                    role,
                  ]);
                });

                results.every((result) => expect(result).toBe(TrueResult));
              });
            });
          });
        });

        describe('Not allowed actions results:', () => {
          it(`should return ${FalseResult} if agent is not active`, () => {
            const guestUser = plainToInstance(User, {
              roles: [plainToInstance(Role, { role: UserRole.GUEST })],
            });
            const inactiveSysadminAgent: RequestAgent = {
              id: 'uuid1234',
              active: false,
              roles: [UserRole.SYS_ADMIN],
            };
            const result = checkAllowed_User_UpdateAction(
              guestUser,
              inactiveSysadminAgent,
              [UserRole.USER],
            );

            expect(result).toBe(FalseResult);
          });

          describe('While agent IS active', () => {
            describe('While applying role update to other user', () => {
              it(`should return ${FalseResult} if agent is plain user or guest, regardless of role`, () => {
                const guestUser = plainToInstance(User, {
                  id: generateRandomUUID(),
                  roles: [plainToInstance(Role, { role: UserRole.GUEST })],
                });
                const plainUserAgent: RequestAgent = {
                  id: generateRandomUUID(),
                  active: true,
                  roles: [UserRole.USER],
                };
                const guestAgent: RequestAgent = {
                  id: generateRandomUUID(),
                  active: true,
                  roles: [UserRole.GUEST],
                };

                const result1 = checkAllowed_User_UpdateAction(
                  guestUser,
                  plainUserAgent,
                  [UserRole.GUEST],
                );
                const result2 = checkAllowed_User_UpdateAction(
                  guestUser,
                  guestAgent,
                  [UserRole.GUEST],
                );

                expect(result1).toBe(FalseResult);
                expect(result2).toBe(FalseResult);
              });

              it(`should return ${FalseResult} if agent role is "${UserRole.ADMIN}" and new role for user is "${UserRole.SYS_ADMIN}"`, () => {
                const guestUser = plainToInstance(User, {
                  id: generateRandomUUID(),
                  roles: [plainToInstance(Role, { role: UserRole.GUEST })],
                });
                const adminAgent: RequestAgent = {
                  id: generateRandomUUID(),
                  active: true,
                  roles: [UserRole.ADMIN],
                };

                const results = ROLES_NOT_ALLOWED_FOR_ADMINS.map((role) => {
                  return checkAllowed_User_UpdateAction(guestUser, adminAgent, [
                    role,
                  ]);
                });

                results.every((result) => expect(result).toBe(FalseResult));
              });
            });

            describe('While applying role update to himself', () => {
              it(`should return ${FalseResult} if agent role is "${UserRole.ADMIN}" and new intended role is NOT allowed (higher privilege)`, () => {
                const userId = 'uuid1234';
                const adminUser = plainToInstance(User, {
                  id: userId,
                  roles: [plainToInstance(Role, { role: UserRole.ADMIN })],
                });
                const adminAgent: RequestAgent = {
                  id: userId,
                  active: true,
                  roles: [UserRole.ADMIN],
                };

                const results = ROLES_NOT_ALLOWED_FOR_ADMINS.map((role) => {
                  return checkAllowed_User_UpdateAction(adminUser, adminAgent, [
                    role,
                  ]);
                });

                results.every((result) => expect(result).toBe(FalseResult));
              });
            });

            it(`should return ${FalseResult} if agent is plain user or guest, regardless of role`, () => {
              const userId = 'uuid1234';
              const guestUser = plainToInstance(User, {
                id: userId,
                roles: [plainToInstance(Role, { role: UserRole.GUEST })],
              });
              const plainUser = plainToInstance(User, {
                id: userId,
                roles: [plainToInstance(Role, { role: UserRole.GUEST })],
              });
              const guestAgent: RequestAgent = {
                id: userId,
                active: true,
                roles: [UserRole.GUEST],
              };
              const plainUserAgent: RequestAgent = {
                id: userId,
                active: true,
                roles: [UserRole.USER],
              };

              const result1 = checkAllowed_User_UpdateAction(
                plainUser,
                plainUserAgent,
                [UserRole.GUEST],
              );
              const result2 = checkAllowed_User_UpdateAction(
                guestUser,
                guestAgent,
                [UserRole.GUEST],
              );

              expect(result1).toBe(FalseResult);
              expect(result2).toBe(FalseResult);
            });
          });
        });
      });
    });

    describe(checkAllowed_User_CreateAction.name, () => {
      describe('While user IS active', () => {
        it(`should return ${TrueResult} if user has high priviledge roles`, () => {
          const adminAgent: RequestAgent = {
            id: '123',
            active: true,
            roles: [UserRole.ADMIN],
          };
          const sysadminAgent: RequestAgent = {
            id: '123',
            active: true,
            roles: [UserRole.SYS_ADMIN],
          };

          expect(checkAllowed_User_CreateAction(adminAgent)).toBe(TrueResult);
          expect(checkAllowed_User_CreateAction(sysadminAgent)).toBe(
            TrueResult,
          );
        });

        it(`should return ${FalseResult} if user has low priviledge roles`, () => {
          const plainUserAgent: RequestAgent = {
            id: '123',
            active: true,
            roles: [UserRole.USER],
          };
          const guestAgent: RequestAgent = {
            id: '123',
            active: true,
            roles: [UserRole.GUEST],
          };

          expect(checkAllowed_User_CreateAction(plainUserAgent)).toBe(
            FalseResult,
          );
          expect(checkAllowed_User_CreateAction(guestAgent)).toBe(FalseResult);
        });
      });

      describe('While agent is NOT active', () => {
        it(`should return ${FalseResult} despite user having high priviledge roles`, () => {
          const inactiveAdminAgent: RequestAgent = {
            id: '123',
            active: false,
            roles: [UserRole.ADMIN],
          };
          const inactiveSysadminAgent: RequestAgent = {
            id: '123',
            active: false,
            roles: [UserRole.SYS_ADMIN],
          };

          expect(checkAllowed_User_CreateAction(inactiveAdminAgent)).toBe(
            FalseResult,
          );
          expect(checkAllowed_User_CreateAction(inactiveSysadminAgent)).toBe(
            FalseResult,
          );
        });
      });
    });
  });
});
