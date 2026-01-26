import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { UserRole } from './enum/user-role.enum';
import { plainToInstance } from 'class-transformer';
import { CreateRoleDTO } from './dto/create-role.dto';

const finOneOrFailMockImplementation = (arg: {
  where: { role: UserRole[] };
}) => {
  return plainToInstance(Role, { role: arg.where.role });
};

describe(RoleService.name, () => {
  let service: RoleService;
  const mockRepository = {
    create: vi.fn().mockImplementation((dto) => plainToInstance(Role, dto)),
    save: vi.fn().mockImplementation((entity: Role) => entity),
    findOneOrFail: vi.fn().mockImplementation(finOneOrFailMockImplementation),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create roles successfully', async () => {
    const dto = plainToInstance(CreateRoleDTO, {
      role: UserRole.USER,
    });
    const newEntity = plainToInstance(Role, dto);

    const result = await service.create(dto);

    expect(mockRepository.create).toHaveBeenCalledTimes(1);
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveReturnedWith(result);
    expect(result).toBeInstanceOf(Role);
    expect(result).toEqual(newEntity);
  });

  it('should find all roles', async () => {
    const result = await service.findRoles([UserRole.ADMIN, UserRole.GUEST]);

    expect(mockRepository.findOneOrFail).toHaveBeenCalledTimes(2);
    expect(result.length).toBe(2);
    result.forEach((role) => expect(role).toBeInstanceOf(Role));
  });
});
