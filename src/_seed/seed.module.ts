import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { SharedAttributesModule } from 'src/resources/shared/shared-attributes.module';

import { UserModule } from 'src/resources/user/user.module';
import { CacheModule } from 'src/infra/cache/cache.module';

@Module({
  imports: [SharedAttributesModule, UserModule, CacheModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
