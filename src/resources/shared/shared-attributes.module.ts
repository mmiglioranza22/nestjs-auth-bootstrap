import { Module } from '@nestjs/common';
import { RoleModule } from 'src/resources/auth/modules/role/role.module';
import { UserModule } from 'src/resources/user/user.module';

@Module({
  imports: [RoleModule, UserModule],
  exports: [RoleModule, UserModule],
})
export class SharedAttributesModule {}
