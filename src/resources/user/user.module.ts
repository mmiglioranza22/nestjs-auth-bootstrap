import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RoleModule } from 'src/resources/auth/modules/role/role.module';
import { MailModule } from 'src/infra/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RoleModule, MailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
