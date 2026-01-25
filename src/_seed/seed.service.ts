import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { seed } from 'src/_seed/data/seed';
import { RoleService } from 'src/resources/auth/modules/role/role.service';
import { DataSource } from 'typeorm';
import { UserService } from 'src/resources/user/user.service';
import { GENERAL_SEED_ERROR } from 'src/common/constants/error-messages';
import { User } from 'src/resources/user/entities/user.entity';
import { generateHash } from 'src/utils';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { CreateUserDTO } from 'src/resources/user/dto/create-user.dto';
import { CacheService } from 'src/infra/cache/cache.service';

import { ConfigService } from '@nestjs/config';
import { type EnvVariables } from 'config/env-variables';

@Injectable()
export class SeedService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly datasource: DataSource,
    private readonly configService: ConfigService<EnvVariables>,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(SeedService.name);
  }

  // * Sys admin created directly in db, must fail if not created
  async run() {
    if (this.configService.getOrThrow('NODE_ENV') === 'production') {
      throw new BadRequestException(
        'Seed method only enabled for development / testing',
      );
    }

    try {
      this.logger.info('Clearing database...');
      await Promise.all([
        this.datasource.dropDatabase(),
        this.cacheService._dropDatabase(),
      ]);
      this.logger.info('Database cleared. Setting db...');
      await this.datasource.synchronize();

      //  ! ORDER OF PROMISES IS RELEVANT!! (roles -> user)
      const { role, user, sysadmin } = seed;

      const promises = [...role.map((r) => this.roleService.create(r))];
      await Promise.all(promises);

      await this.createSysAdminUser(sysadmin);

      // * not ideal, dto contains roles here
      await Promise.all(user.map((u) => this.userService.createUser(u)));

      this.logger.info('Database set. Seed entities created.');

      return { ok: true };
    } catch (error: unknown) {
      this.logger.error(error);
      throw new InternalServerErrorException(GENERAL_SEED_ERROR);
    }
  }

  // * Most restricted method. Access should be limited as much as possible.
  private async createSysAdminUser(user: CreateUserDTO): Promise<void> {
    const queryRunner = this.datasource.createQueryRunner(); // Test this?

    try {
      // * Roles must be initialized (this could be decoupled), specific role could even be created here
      const sysRole = await this.roleService.findRoles([UserRole.SYS_ADMIN]);

      await queryRunner.connect();
      await queryRunner.startTransaction();

      const { password } = user;

      const dto = {
        ...user,
        hash: await generateHash(password),
        roles: sysRole,
        verifiedAccount: true,
      };

      await queryRunner.manager.save(User, dto);
      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
