/* eslint-disable @typescript-eslint/unbound-method */

import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { generateRandomUUID } from 'src/utils';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { UpdateUserDTO } from './dto/update-user.dto';
import { CacheService } from 'src/infra/cache/cache.service';
import { CsrfTokenService } from '../auth/modules/csrf-token/csrf-token.service';

describe(UserController.name, () => {
  let controller: UserController;
  const mockService = createMock<UserService>();
  // deps used by guards
  const mockCacheService = createMock<CacheService>(); // UserRoleGuard
  const mockCsrfService = createMock<CsrfTokenService>(); // CsrfGuard

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockService },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CsrfTokenService,
          useValue: mockCsrfService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create method with proper arguments', async () => {
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

    await controller.createUser(dto, agent);

    expect(mockService.createUser).toHaveBeenCalledTimes(1);
    expect(mockService.createUser).toHaveBeenCalledWith(dto, agent);
  });

  it('should call find all method with proper arguments', async () => {
    await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalledTimes(1);
    expect(mockService.findAll).toHaveBeenCalledWith();
  });

  it('should call find on method with proper arguments', async () => {
    const id = 'uuid123';

    await controller.findOne(id);

    expect(mockService.findOneById).toHaveBeenCalledTimes(1);
    expect(mockService.findOneById).toHaveBeenCalledWith(id);
  });

  it('should call deactivate user method with proper arguments', async () => {
    const id = 'uuid123';
    const agent: RequestAgent = {
      id: generateRandomUUID(),
      active: true,
      roles: [UserRole.ADMIN],
    };

    await controller.deactivateUser(id, agent);

    expect(mockService.deactivateUser).toHaveBeenCalledTimes(1);
    expect(mockService.deactivateUser).toHaveBeenCalledWith(id, agent);
  });

  it('should call update method with proper arguments', async () => {
    const id = 'uuid1234';
    const dto = plainToInstance(UpdateUserDTO, {
      username: 'user2',
    });
    const agent: RequestAgent = {
      id: generateRandomUUID(),
      active: true,
      roles: [UserRole.ADMIN],
    };

    await controller.update(id, dto, agent);

    expect(mockService.updateUser).toHaveBeenCalledTimes(1);
    expect(mockService.updateUser).toHaveBeenCalledWith(id, dto, agent);
  });

  it('should call delete method with proper arguments', async () => {
    const id = 'uuid123';
    const agent: RequestAgent = {
      id: generateRandomUUID(),
      active: true,
      roles: [UserRole.ADMIN],
    };

    await controller.delete(id, agent);

    expect(mockService.deleteUser).toHaveBeenCalledTimes(1);
    expect(mockService.deleteUser).toHaveBeenCalledWith(id, agent);
  });
});
