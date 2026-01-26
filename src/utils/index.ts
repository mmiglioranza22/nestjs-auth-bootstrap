import * as bcrypt from 'bcrypt';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

import { v4 as uuidv4, validate } from 'uuid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';

import { User } from 'src/resources/user/entities/user.entity';
import { ROLES_NOT_ALLOWED_FOR_ADMINS } from 'src/common/constants/allowed-user-roles-updates';

dayjs.extend(utc);

export const generateHash = async (input: string): Promise<string> => {
  return await bcrypt.hash(input, 10);
};

export const checkHash = async (
  input: string,
  hash: string,
): Promise<boolean> => {
  return await bcrypt.compare(input, hash);
};

export const generateRandomUUID = (): string => {
  return uuidv4();
};

export const isUUID = (input: string) => {
  return validate(input);
};

export const calculateFutureUTCDate = (futureHours: number): Date => {
  const now = dayjs();
  const futureTime = now.add(futureHours, 'hours');

  return new Date(futureTime.utc().format());
};

export const getUserRolesList = (roles: Role[]): UserRole[] => {
  return roles.map((r) => r.role);
};

// ** USER RELATED ACTIONS CHECKERS
// Both update and delete paths
export const checkAllowedActionOn_User = (
  user: User,
  agent: RequestAgent,
): boolean => {
  const userRoles = user.roles.map((role) => role.role);

  if (agent.active) {
    if (agent.roles.includes(UserRole.SYS_ADMIN)) {
      return true;
    } else if (
      agent.roles.includes(UserRole.ADMIN) &&
      !userRoles.includes(UserRole.ADMIN) &&
      !userRoles.includes(UserRole.SYS_ADMIN)
    ) {
      return true;
    } else if (user.id === agent.id) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

export const checkAllowed_User_UpdateAction = (
  user: User,
  agent: RequestAgent,
  roles: UserRole[] | undefined = undefined,
): boolean => {
  const userRoles = user.roles.map((role) => role.role);

  // * Not role related, delegate to generic check
  if (!roles) {
    return checkAllowedActionOn_User(user, agent);
  } else {
    // * All role related
    if (agent.active) {
      // * For self actions, existing roles in DB are the ones to be considered: user.roles (Hypothetical case agent roles are altered mid-request)
      if (user.id === agent.id) {
        // Admin can't assign himself sys-admin role
        if (userRoles.includes(UserRole.ADMIN)) {
          let isAllowed = true;
          for (const role of roles) {
            if (ROLES_NOT_ALLOWED_FOR_ADMINS.includes(role)) {
              isAllowed = false;
              break;
            }
          }
          return isAllowed;
        }
        // ? Sysadmin, once granted that role can't change it
        // ? Plain users and guests can't change roles to themselves
        else {
          return false;
        }
      } else {
        // * All role-related actions done by sysadmins are allowed
        if (agent.roles.includes(UserRole.SYS_ADMIN)) {
          return true;
        }
        // Admins are only forbidden from assigning sysadmins
        else if (agent.roles.includes(UserRole.ADMIN)) {
          if (roles.includes(UserRole.SYS_ADMIN)) {
            return false;
          } else {
            return true;
          }
        }
        // Plain users and guests role can't do any change to other users
        else {
          return false;
        }
      }
    } else {
      return false;
    }
  }
};

export const checkAllowed_User_CreateAction = (
  agent: RequestAgent,
): boolean => {
  if (
    !agent.active ||
    agent?.roles.includes(UserRole.USER) ||
    agent?.roles.includes(UserRole.GUEST)
  ) {
    return false;
  } else {
    return true;
  }
};
