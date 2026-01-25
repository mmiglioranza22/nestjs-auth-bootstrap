import { Body, Controller, Get, Post } from '@nestjs/common';
import { LogLevel, LogLevelService } from './log-level.service';
import { Private } from 'src/resources/auth/guards/private/private.decorator';
import { CsrfCheck } from 'src/resources/auth/decorators/csrf-check/csrf-check.decorator';
import { AuthorizedRoles } from 'src/resources/auth/decorators/authorized-roles/authorized-roles.decorator';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

@Private()
@CsrfCheck()
@AuthorizedRoles(UserRole.SYS_ADMIN)
@Controller('admin/log-level')
export class LogLevelController {
  constructor(private readonly service: LogLevelService) {}

  @Get()
  getLevel() {
    return { level: this.service.getLevel() };
  }

  @Post()
  setLevel(@Body('level') level: LogLevel) {
    this.service.setLevel(level);
    return { level };
  }
}
