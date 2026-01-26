/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createMock } from '@golevelup/ts-vitest';
import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { RoleService } from 'src/resources/auth/modules/role/role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './dto/create-user.dto';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { generateHash, generateRandomUUID } from 'src/utils';
import { LoginSlugDTO } from 'src/resources/auth/dto/login-slug.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { BadRequestException } from '@nestjs/common';
import * as ErrorMessages from 'src/common/constants/error-messages';
import { ROLES_NOT_ALLOWED_FOR_ADMINS } from 'src/common/constants/allowed-user-roles-updates';
import { CacheService } from 'src/infra/cache/cache.service';

describe(UserService.name, () => {
  let service: UserService;
  const mockUserRepository = createMock<Repository<User>>({
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
  });

  const mockRoleService = createMock<RoleService>();
  const mockCacheService = createMock<CacheService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // * used by self and auth
  describe('Create user:', () => {
    it('should create a valid user entity', async () => {
      const dto = plainToInstance(CreateUserDTO, {
        name: 'user',
        username: 'user1',
        email: 'user@mail.com',
        password: 'HackM3!IfUC4n',
        roles: [UserRole.GUEST],
      });
      const agent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.ADMIN],
      };

      await service.createUser(dto, agent);

      expect(mockRoleService.findRoles).toHaveBeenCalledTimes(1);
      expect(mockRoleService.findRoles).toHaveBeenCalledWith(dto.roles);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: expect.any(String),
        }),
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          password: expect.anything(),
        }),
      );
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw if agent lacks proper permissions to make updates to other users', async () => {
      const dto = plainToInstance(CreateUserDTO, {
        name: 'user',
        username: 'user1',
        email: 'user@mail.com',
        password: 'HackM3!IfUC4n',
        roles: [UserRole.GUEST],
      });
      const invalidUserAgent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.USER],
      };
      const invalidGuestAgent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.USER],
      };

      const invalidUserAgentResult = service.createUser(dto, invalidUserAgent);
      const invalidGuestAgentResult = service.createUser(
        dto,
        invalidGuestAgent,
      );

      await expect(
        async () => await invalidUserAgentResult,
      ).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
      );
      await expect(
        async () => await invalidGuestAgentResult,
      ).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
      );
    });
  });

  describe('Query users', () => {
    it('should find all active users', async () => {
      await service.findAll();

      expect(mockUserRepository.find).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { active: true },
      });
    });

    it('should find user by its id', async () => {
      const id = 'uuid1234';

      await service.findOneById(id);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          id,
        },
        relations: { roles: true },
      });
    });

    it('should find user by email', async () => {
      const dto: LoginSlugDTO = { slug: 'test@email.com' };

      await service.findOneBySlug(dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: dto.slug,
        },
        relations: {
          roles: true,
        },
      });
    });

    it('should find user by username', async () => {
      const dto: LoginSlugDTO = { slug: 'someusername123' };

      await service.findOneBySlug(dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          username: dto.slug,
        },
        relations: {
          roles: true,
        },
      });
    });
  });

  describe('Update user', () => {
    it('should update user entity', async () => {
      const id = 'uuid1234';
      const dto = plainToInstance(UpdateUserDTO, {
        username: 'newUsername123',
        email: 'new@email.com',
        password: 'Newpasswod123!',
        oldPassword: 'OldPassword444!',
        roles: [UserRole.ADMIN],
      });
      const agent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.SYS_ADMIN],
      };

      vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
        plainToInstance(User, {
          roles: [plainToInstance(Role, { role: UserRole.ADMIN })],
        }),
      );

      await service.updateUser(id, dto, agent);

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: dto.username,
        }),
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.not.objectContaining({
          password: expect.anything(),
        }),
      );
    });

    it('should throw if user cannot perform action', async () => {
      const id = 'uuid1234';
      const dto = plainToInstance(UpdateUserDTO, {
        username: 'newUsername123',
        roles: [UserRole.USER],
      });
      const agent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.GUEST],
      };

      const result = service.updateUser(id, dto, agent);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_AGENT_ACTION_USER,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw if agent is inactive', async () => {
      const userId = 'uuid1234';
      vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
        plainToInstance(User, {
          id: userId,
          roles: [plainToInstance(Role, { role: UserRole.USER })],
        }),
      );

      const yetAnotherId = 'uuid890';

      const dtoNotPossibleForAdminUser = plainToInstance(UpdateUserDTO, {
        roles: ROLES_NOT_ALLOWED_FOR_ADMINS,
      });

      const adminAgent: RequestAgent = {
        id: yetAnotherId,
        active: false,
        roles: [UserRole.ADMIN],
      };

      const result = service.updateUser(
        userId,
        dtoNotPossibleForAdminUser,
        adminAgent,
      );

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_AGENT_ACTION_USER,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    describe('Generic updateUser method:', () => {
      describe('Non-role related updates:', () => {
        describe('When agent performs updates to himself', () => {
          it('should update his own email', async () => {
            const userId = 'uuid1234';
            const dto = plainToInstance(UpdateUserDTO, {
              email: 'new_awesome@email.com',
            });
            const agent: RequestAgent = {
              id: userId,
              active: true,
              roles: [UserRole.USER],
            };

            vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
              plainToInstance(User, {
                id: userId,
                roles: [plainToInstance(Role, { role: UserRole.USER })],
              }),
            );
            await service.updateUser(userId, dto, agent);

            expect(mockUserRepository.findOneOrFail).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                email: dto.email,
              }),
            );
          });

          it('should update his own password', async () => {
            const userId = 'uuid1234';
            const password = 'Newpasswod123!';
            const oldPassword = 'OldPassword444!';
            const userHash = await generateHash(oldPassword);
            const dto = plainToInstance(UpdateUserDTO, {
              password,
              oldPassword,
            });
            const agent: RequestAgent = {
              id: userId,
              active: true,
              roles: [UserRole.USER],
            };

            vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
              plainToInstance(User, {
                id: userId,
                hash: userHash,
                roles: [plainToInstance(Role, { role: UserRole.USER })],
              }),
            );

            await service.updateUser(userId, dto, agent);

            expect(mockUserRepository.findOneOrFail).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                username: dto.username,
              }),
            );
            expect(mockUserRepository.save).toHaveBeenCalledWith(
              expect.not.objectContaining({
                password: expect.anything(),
              }),
            );
          });

          it('should throw if either new password or old password are not sent', async () => {
            const userId = 'uuid1234';
            const password = 'Newpasswod123!';
            const oldPassword = 'OldPassword444!';
            const userHash = await generateHash(oldPassword);
            const dtoMissingNewPassword = plainToInstance(UpdateUserDTO, {
              oldPassword,
              password: '',
            });
            const dtoMissingOldPassword = plainToInstance(UpdateUserDTO, {
              password,
              oldPassword: '',
            });

            const agent: RequestAgent = {
              id: userId,
              active: true,
              roles: [UserRole.USER],
            };

            vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
              plainToInstance(User, {
                id: userId,
                hash: userHash,
                roles: [plainToInstance(Role, { role: UserRole.USER })],
              }),
            );

            const missingNewPasswordResult = service.updateUser(
              userId,
              dtoMissingNewPassword,
              agent,
            );
            const missingOldPasswordResult = service.updateUser(
              userId,
              dtoMissingOldPassword,
              agent,
            );

            await expect(
              async () => await missingNewPasswordResult,
            ).rejects.toThrowWithMessage(
              BadRequestException,
              ErrorMessages.MISSING_USER_PASSWORDS,
            );

            await expect(
              async () => await missingOldPasswordResult,
            ).rejects.toThrowWithMessage(
              BadRequestException,
              ErrorMessages.MISSING_USER_PASSWORDS,
            );
          });

          it('should throw if new password is old password', async () => {
            const userId = 'uuid1234';
            const oldPassword = 'OldPassword444!';
            const password = oldPassword;
            const oldPasswordHash = await generateHash(oldPassword);
            const samePasswordsDto = plainToInstance(UpdateUserDTO, {
              oldPassword,
              password,
            });

            const agent: RequestAgent = {
              id: userId,
              active: true,
              roles: [UserRole.USER],
            };

            vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
              plainToInstance(User, {
                id: userId,
                hash: oldPasswordHash,
                roles: [plainToInstance(Role, { role: UserRole.USER })],
              }),
            );

            const result = service.updateUser(userId, samePasswordsDto, agent);

            await expect(async () => await result).rejects.toThrowWithMessage(
              BadRequestException,
              ErrorMessages.INVALID_USER_NEW_PASSWORD,
            );

            expect(mockUserRepository.save).not.toHaveBeenCalled();
          });

          it('should throw if old password is not correct', async () => {
            const userId = 'uuid1234';
            const oldPassword = 'OldPassword444!';
            const password = 'Newpasssss12312!';
            const wrongHash = await generateHash(password);
            const dtoMissingNewPassword = plainToInstance(UpdateUserDTO, {
              oldPassword,
              password,
            });

            const agent: RequestAgent = {
              id: userId,
              active: true,
              roles: [UserRole.USER],
            };

            vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
              plainToInstance(User, {
                id: userId,
                hash: wrongHash,
                roles: [plainToInstance(Role, { role: UserRole.USER })],
              }),
            );

            const result = service.updateUser(
              userId,
              dtoMissingNewPassword,
              agent,
            );

            await expect(async () => await result).rejects.toThrowWithMessage(
              BadRequestException,
              ErrorMessages.INVALID_USER_OLD_PASSWORD,
            );
            expect(mockUserRepository.save).not.toHaveBeenCalled();
          });
        });
      });

      describe('Role related updates: ', () => {
        it('should throw if agent lacks proper permissions to modify own roles', async () => {
          const userId = 'uuid1234';
          const dto = plainToInstance(CreateUserDTO, {
            roles: [UserRole.GUEST],
          });
          const invalidUserAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [UserRole.GUEST],
          };
          const invalidGuestAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [UserRole.USER],
          };

          vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
            plainToInstance(User, {
              id: userId,
              roles: [plainToInstance(Role, { role: UserRole.USER })], // role here does not matter
            }),
          );

          const invalidUserAgentResult = service.createUser(
            dto,
            invalidUserAgent,
          );
          const invalidGuestAgentResult = service.createUser(
            dto,
            invalidGuestAgent,
          );

          await expect(
            async () => await invalidUserAgentResult,
          ).rejects.toThrowWithMessage(
            BadRequestException,
            ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
          );

          await expect(
            async () => await invalidGuestAgentResult,
          ).rejects.toThrowWithMessage(
            BadRequestException,
            ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
          );
          expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it('should throw if admin tries to assign himself a role not allowed due to his current role/s', async () => {
          const userId = 'uuid1234';
          vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
            plainToInstance(User, {
              id: userId,
              roles: [plainToInstance(Role, { role: UserRole.ADMIN })],
            }),
          );

          const dtoNotPossibleForAdminUser = plainToInstance(UpdateUserDTO, {
            roles: ROLES_NOT_ALLOWED_FOR_ADMINS,
          });

          const adminAgent: RequestAgent = {
            id: userId,
            active: true,
            roles: [UserRole.ADMIN],
          };

          const result = service.updateUser(
            userId,
            dtoNotPossibleForAdminUser,
            adminAgent,
          );

          await expect(async () => await result).rejects.toThrowWithMessage(
            BadRequestException,
            ErrorMessages.INVALID_AGENT_ACTION_USER,
          );
          expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it(`should throw if agent has admin roles and tries to assign ${UserRole.SYS_ADMIN} to any user or himself`, async () => {
          const userId = 'uuid1234';
          vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
            plainToInstance(User, {
              id: userId,
              roles: [plainToInstance(Role, { role: UserRole.USER })],
            }),
          );

          const yetAnotherId = 'uuid890';

          const dtoNotPossibleForAdminUser = plainToInstance(UpdateUserDTO, {
            roles: ROLES_NOT_ALLOWED_FOR_ADMINS,
          });

          const adminAgent: RequestAgent = {
            id: yetAnotherId,
            active: true,
            roles: [UserRole.ADMIN],
          };

          const sameAdminAgent: RequestAgent = {
            id: yetAnotherId,
            active: true,
            roles: [UserRole.ADMIN],
          };

          const result = service.updateUser(
            userId,
            dtoNotPossibleForAdminUser,
            adminAgent,
          );

          const sameAdminResult = service.updateUser(
            userId,
            dtoNotPossibleForAdminUser,
            sameAdminAgent,
          );

          await expect(async () => await result).rejects.toThrowWithMessage(
            BadRequestException,
            ErrorMessages.INVALID_AGENT_ACTION_USER,
          );

          await expect(
            async () => await sameAdminResult,
          ).rejects.toThrowWithMessage(
            BadRequestException,
            ErrorMessages.INVALID_AGENT_ACTION_USER,
          );

          expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
      });
    });

    describe('Specific method - updateUserPassword: ', () => {
      // * used by self and auth service
      it('should update user password correctly (persist hash)', async () => {
        const oldPassword = 'HackM3N0wIFyouC4an!';
        const userHash = await generateHash(oldPassword);
        const user = plainToInstance(User, { id: 'uuid1234', hash: userHash });
        const newPassword = 'Password-already-validated-by-validation-pipes';

        await service.updateUserPassword(user, newPassword);

        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.update).toHaveBeenCalledWith(
          user.id,
          expect.objectContaining({
            hash: expect.any(String),
          }),
        );
        expect(mockUserRepository.update).toHaveBeenCalledWith(
          user.id,
          expect.not.objectContaining({
            password: expect.anything(),
          }),
        );
      });

      it('should throw if new password is the same as the last password', async () => {
        const oldPassword = 'HackM3N0wIFyouC4an!';
        const userHash = await generateHash(oldPassword);
        const user = plainToInstance(User, { id: 'uuid1234', hash: userHash });
        const newPassword = oldPassword;

        const result = service.updateUserPassword(user, newPassword);

        await expect(async () => await result).rejects.toThrowWithMessage(
          BadRequestException,
          ErrorMessages.INVALID_NEW_PASSWORD_ALREADY_USED,
        );

        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('Specific method - deactivateUser: ', () => {
      it('should deactivate user', async () => {
        vi.spyOn(mockUserRepository, 'findOneOrFail').mockResolvedValue(
          plainToInstance(User, {
            roles: [plainToInstance(Role, { roles: UserRole.USER })],
          }),
        );

        const id = 'uuid1234';
        const agent: RequestAgent = {
          id: generateRandomUUID(),
          active: true,
          roles: [UserRole.ADMIN],
        };

        await service.deactivateUser(id, agent);

        expect(mockUserRepository.findOneOrFail).toHaveBeenCalledBefore(
          mockUserRepository.update,
        );

        expect(mockUserRepository.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
          where: { id, active: true },
          relations: { roles: true },
        });
        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.update).toHaveBeenCalledWith(id, {
          active: false,
        });
      });

      it('should check if user can perform action', async () => {
        const id = 'uuid1234';
        const agent: RequestAgent = {
          id: generateRandomUUID(),
          active: true,
          roles: [UserRole.GUEST],
        };

        const result = service.deactivateUser(id, agent);

        await expect(async () => await result).rejects.toThrowWithMessage(
          BadRequestException,
          ErrorMessages.INVALID_AGENT_ACTION_USER,
        );

        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    // * used by auth service only
    describe('Specific method - verifyUserAccount: ', () => {
      it('should verify users account and update entity accordingly', async () => {
        const user = plainToInstance(User, { verifiedAccount: false });

        await service.verifyUserAccount(user);

        expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            verifiedAccount: true,
          }),
        );
      });
    });
  });

  describe('Delete user', () => {
    it('should delete user entity if exists', async () => {
      const id = 'uuid1234';
      const sysadminAgent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.SYS_ADMIN],
      };
      const adminAgent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.ADMIN],
      };

      vi.spyOn(mockUserRepository, 'findOne').mockResolvedValue(
        plainToInstance(User, {
          id,
          roles: [UserRole.USER],
        }),
      );

      await service.deleteUser(id, sysadminAgent);
      await service.deleteUser(id, adminAgent);

      expect(mockUserRepository.findOne).toHaveBeenCalledBefore(
        mockUserRepository.remove,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledBefore(
        mockCacheService.invalidate,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: {
          roles: true,
        },
      });
      expect(mockUserRepository.remove).toHaveBeenCalledTimes(2);
      expect(mockCacheService.invalidate).toHaveBeenCalledTimes(2);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(id);
      expect(mockUserRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
        }),
      );
    });

    it("should throw if agent can't perform action lacking permissions", async () => {
      const id = 'uuid1234';
      const agent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.GUEST],
      };

      const result = service.deleteUser(id, agent);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.INVALID_AGENT_ACTION_USER,
      );

      expect(mockUserRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw if user to be deleted does not exist', async () => {
      const id = 'uuid1234';
      const agent: RequestAgent = {
        id: generateRandomUUID(),
        active: true,
        roles: [UserRole.SYS_ADMIN],
      };

      vi.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      const result = service.deleteUser(id, agent);

      await expect(async () => await result).rejects.toThrowWithMessage(
        BadRequestException,
        ErrorMessages.IMPOSSIBLE_ACTION_USER_NOT_FOUND,
      );

      expect(mockUserRepository.remove).not.toHaveBeenCalled();
    });
  });
});
