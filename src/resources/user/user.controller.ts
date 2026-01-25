import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';
import { Private } from 'src/resources/auth/guards/private/private.decorator';
import { UUIDParam } from 'src/common/decorators/uuid-param/uuid-param.decorator';
import { GetUser } from 'src/resources/auth/decorators/get-user/get-user.decorator';
import { type RequestAgent } from 'src/resources/auth/interfaces/request-agent.interface';
import { Protected } from 'src/resources/auth/decorators/protected/protected.decorator';
import { AuthorizedRoles } from 'src/resources/auth/decorators/authorized-roles/authorized-roles.decorator';
import { UserResponseDTO } from './dto/user-response.dto';
import { CsrfCheck } from 'src/resources/auth/decorators/csrf-check/csrf-check.decorator';

@ApiTags('User')
@Private()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Protected()
  @Post()
  createUser(
    @Body() createUserDto: CreateUserDTO,
    @GetUser() agent: RequestAgent,
  ): Promise<UserResponseDTO | null> {
    return this.userService.createUser(createUserDto, agent);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@UUIDParam('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Protected()
  @Patch('deactivate/:id')
  deactivateUser(@UUIDParam('id') id: string, @GetUser() agent: RequestAgent) {
    return this.userService.deactivateUser(id, agent);
  }

  @Protected()
  @Patch(':id')
  update(
    @UUIDParam('id') id: string,
    @Body() updateUserDto: UpdateUserDTO,
    @GetUser() agent: RequestAgent,
  ) {
    return this.userService.updateUser(id, updateUserDto, agent);
  }

  @AuthorizedRoles(UserRole.SYS_ADMIN)
  @CsrfCheck()
  @Delete(':id')
  delete(@UUIDParam('id') id: string, @GetUser() agent: RequestAgent) {
    return this.userService.deleteUser(id, agent);
  }
}
