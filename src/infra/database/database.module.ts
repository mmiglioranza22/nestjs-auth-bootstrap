// https://stackoverflow.com/questions/70654128/gracefully-closing-connection-of-db-using-typeorm-in-nestjs
import { Module } from '@nestjs/common';
import { TypeOrmImplModule } from './implementations/typeorm/typeorm.impl.module';

@Module({
  imports: [TypeOrmImplModule],
  exports: [TypeOrmImplModule],
})
export class DatabaseModule {}
