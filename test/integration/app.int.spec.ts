import { Test, TestingModule } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/infra/database/database.module';
import { UserModule } from '../../src/resources/user/user.module';
import { SeedModule } from '../../src/_seed/seed.module';
import { AuthModule } from '../../src/resources/auth/auth.module';
import { CacheModule } from '../../src/infra/cache/cache.module';
import {
  TestContainersSetup,
  type Containers,
} from '../helpers/testcontainers.setup';

describe(AppModule.name, () => {
  let moduleRef: TestingModule;
  let appModule: AppModule;
  let configModule: ConfigModule;
  let throttlerModule: ThrottlerModule;
  let clsModule: ClsModule;
  let loggerModule: LoggerModule;
  let databaseModule: DatabaseModule;
  let userModule: UserModule;
  let seedModule: SeedModule;
  let authModule: AuthModule;
  let cacheModule: CacheModule;

  let imports: ModuleRef[] = [];
  let containersSetup: Containers;
  beforeAll(async () => {
    containersSetup = await TestContainersSetup.setup(1000);
  });

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);

    appModule = moduleRef.get<AppModule>(AppModule);

    configModule = moduleRef.get<ConfigModule>(ConfigModule);
    throttlerModule = moduleRef.get<ThrottlerModule>(ThrottlerModule);
    clsModule = moduleRef.get<ClsModule>(ClsModule);
    loggerModule = moduleRef.get<LoggerModule>(LoggerModule);
    databaseModule = moduleRef.get<DatabaseModule>(DatabaseModule);
    userModule = moduleRef.get<UserModule>(UserModule);
    seedModule = moduleRef.get<SeedModule>(SeedModule);
    authModule = moduleRef.get<AuthModule>(AuthModule);
    cacheModule = moduleRef.get<CacheModule>(CacheModule);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
    await containersSetup.stopAllContainers();
  });

  it('it should be defined', () => {
    expect(appModule).toBeDefined();
  });

  it('should be defined with providers', () => {
    // Some modules give false negatives in toBeDefined (cacheModule, databseModule)
    // hence testing the number of imports reduces risk of passing modules inadvertently
    // (Minimal error can still exist: cache and database modules are not distinguished)
    const declaredImports = [
      configModule,
      throttlerModule,
      clsModule,
      loggerModule,
      databaseModule,
      userModule,
      seedModule,
      authModule,
      cacheModule,
    ];
    expect(declaredImports.length).toEqual(imports.length);

    declaredImports.forEach((module) => {
      expect(module).toBeDefined();
    });
  });
});
