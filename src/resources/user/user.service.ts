// https://stackoverflow.com/questions/59645009/how-to-return-only-some-columns-of-a-relations-with-typeorm
import * as ErrorMessages from 'src/common/constants/error-messages';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';

import {
  checkHash,
  checkAllowedActionOn_User,
  generateHash,
  checkAllowed_User_UpdateAction,
  checkAllowed_User_CreateAction,
} from 'src/utils';
import { LoginSlugDTO } from 'src/resources/auth/dto/login-slug.dto';

import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { UserResponseDTO } from './dto/user-response.dto';
import { CacheService } from 'src/infra/cache/cache.service';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { RoleService } from 'src/resources/auth/modules/role/role.service';

type Slug = keyof Pick<User, 'email' | 'username'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
    private readonly cacheService: CacheService,
  ) {}

  async createUser(
    { password, roles, ...rest }: CreateUserDTO,
    agent?: RequestAgent,
  ): Promise<UserResponseDTO | null> {
    // * User / guest check. Auth user creation via signup should skip it
    if (agent) {
      const canPerformAction = checkAllowed_User_CreateAction(agent);
      if (!canPerformAction) {
        throw new BadRequestException(
          ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
        );
      }
    }
    const userDto = {
      hash: await generateHash(password),
      ...rest,
    };

    const userRoles = await this.parseAllowedRoles(roles, agent);

    const user = this.userRepository.create(userDto);

    user.roles = userRoles;

    await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hash, ...userResponse } = user;

    return userResponse;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({ where: { active: true } });
  }

  // * Allowed to be null. Top method must handle null case
  async findOneById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: { roles: true },
    });

    return user;
  }

  // * Allowed to be null. Top method must handle null case
  async findOneBySlug({ slug }: LoginSlugDTO): Promise<User | null> {
    const key: Slug = slug.includes('@') ? 'email' : 'username';

    const user = await this.userRepository.findOne({
      where: { [key]: slug },
      relations: {
        roles: true,
      },
    });

    return user;
  }

  async updateUser(
    id: string,
    { email, password, oldPassword, roles, ...rest }: UpdateUserDTO,
    agent: RequestAgent,
  ): Promise<User> {
    const user = await this.findActiveUser(id);

    const canPerformAction = checkAllowed_User_UpdateAction(user, agent, roles);

    if (!canPerformAction) {
      throw new BadRequestException(ErrorMessages.INVALID_AGENT_ACTION_USER);
    }

    // * Only same user should be able to change password and email
    if (user.id === agent.id) {
      await this.canUpdatePassword(user, password, oldPassword);
      if (password) {
        user.hash = await generateHash(password);
        // ? can use mail service to inform password change
      }
      if (email) {
        user.email = email;
        // ? can use mail service to inform email change
      }
    }
    // * email and password change made by other users (admins, sysadmins) fail silently

    // * Role changes can be made only in specific cases, and as a rule of thumb, not to self
    user.roles = await this.updateTargetUserRoles(user, roles);

    const updatedUser = await this.userRepository.save({
      ...user,
      ...rest,
    });

    return updatedUser;
  }

  async updateUserPassword(user: User, newPassword: string) {
    // ? Mind that if token is obtained, this could leak password being brute forced. Long throttle is key to avoid it.
    // ? Failing silently here is bad UX
    if (await checkHash(newPassword, user.hash)) {
      throw new BadRequestException(
        ErrorMessages.INVALID_NEW_PASSWORD_ALREADY_USED,
      );
    }
    await this.userRepository.update(user.id, {
      hash: await generateHash(newPassword),
    });
  }

  // * Deactivation does not alter quest ownership or status, deleting user from database does
  // deactivated users are can no longer interact with application, entities and are not assignable to quests
  async deactivateUser(id: string, agent: RequestAgent): Promise<void> {
    const user = await this.findActiveUser(id);

    const canPerformAction = checkAllowedActionOn_User(user, agent);

    if (!canPerformAction) {
      throw new BadRequestException(ErrorMessages.INVALID_AGENT_ACTION_USER);
    }

    // * action to self is allowed
    await Promise.all([
      this.userRepository.update(id, { active: false }),
      this.cacheService.invalidate(id),
    ]);
  }

  async deleteUser(id: string, agent: RequestAgent): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: {
        roles: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        ErrorMessages.IMPOSSIBLE_ACTION_USER_NOT_FOUND,
      );
    }

    const canPerformAction = checkAllowedActionOn_User(user, agent);

    if (!canPerformAction) {
      throw new BadRequestException(ErrorMessages.INVALID_AGENT_ACTION_USER);
    }

    // * action to self is allowed
    await Promise.all([
      this.userRepository.remove(user),
      this.cacheService.invalidate(id),
    ]);
  }

  async verifyUserAccount(user: User): Promise<void> {
    user.verifiedAccount = true;
    await this.userRepository.save(user);
  }

  private async findActiveUser(id: string): Promise<User> {
    return this.userRepository.findOneOrFail({
      where: { id, active: true },
      relations: {
        roles: true,
      },
    });
  }

  private async canUpdatePassword(
    user: User,
    newPassword?: string,
    oldPassword?: string,
  ): Promise<void> {
    if ((newPassword && !oldPassword) || (oldPassword && !newPassword)) {
      throw new BadRequestException(ErrorMessages.MISSING_USER_PASSWORDS);
    }
    if (newPassword && oldPassword) {
      if (newPassword === oldPassword) {
        // Using an old password as a new one
        if (newPassword && (await checkHash(newPassword, user.hash))) {
          throw new BadRequestException(
            ErrorMessages.INVALID_USER_NEW_PASSWORD,
          );
        }
      } else {
        // Using an invalid old password
        if (oldPassword && !(await checkHash(oldPassword, user.hash))) {
          throw new BadRequestException(
            ErrorMessages.INVALID_USER_OLD_PASSWORD,
          );
        }
      }
    }
  }

  // * Roles are sent as immutable (not specified gets filtered out)
  // If no roles are sent in DTO, don't modify current target user's roles
  // If roles are sent, distinguish between empty list (remove roles) and new roles assigned (user -> admin)
  // Roles array with valid roles, assign those roles (must contain previous roles if these are to be kept)
  // Empty array of roles, assign GUEST (readonly resources)
  private async updateTargetUserRoles(
    targetUser: User,
    roles: UserRole[] | undefined,
  ): Promise<Role[]> {
    if (roles) {
      if (roles.length > 0) {
        return await this.roleService.findRoles(roles);
      } else {
        return await this.roleService.findRoles([UserRole.GUEST]);
      }
    } else {
      return targetUser.roles;
    }
  }

  private async parseAllowedRoles(
    roles?: UserRole[],
    agent?: RequestAgent,
  ): Promise<Role[]> {
    // * Specific condition from authService when creating users during signup (assigns sysadmin role always)
    if (!agent && roles) {
      return await this.roleService.findRoles(roles);
    }

    if (!agent) {
      throw new BadRequestException(
        ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
      );
    } else {
      if (roles) {
        if (agent?.roles.includes(UserRole.SYS_ADMIN)) {
          return await this.roleService.findRoles(roles);
        } else {
          // * Admins can't create sysadmins
          if (agent.roles.includes(UserRole.ADMIN)) {
            roles = roles?.filter((role) => role !== UserRole.SYS_ADMIN);
            return await this.roleService.findRoles(roles);
          }
          // * Users and guests redundant check
          else {
            throw new BadRequestException(
              ErrorMessages.INVALID_ACTION_MISSING_CLEAREANCE,
            );
          }
        }
      } else {
        throw new BadRequestException('Invalid action. Missing roles');
      }
    }
  }
}
