import { Injectable } from '@nestjs/common';
import { CreateRoleDTO } from './dto/create-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { UserRole } from './enum/user-role.enum';
import { Repository } from 'typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDTO) {
    const role = this.roleRepository.create(createRoleDto);
    await this.roleRepository.save(role);
    return role;
  }

  async findRoles(roles: UserRole[]) {
    const roleMap = roles.map((role) =>
      this.roleRepository.findOneOrFail({
        where: { role: role },
      }),
    );
    return await Promise.all(roleMap);
  }
}
