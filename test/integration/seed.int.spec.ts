/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { App } from 'supertest/types';
import TestAgent from 'supertest/lib/agent';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

import { AppModule } from 'src/app.module';
import { User } from 'src/resources/user/entities/user.entity';
import { seed } from 'src/_seed/data/seed';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import { RecoveryToken } from 'src/resources/auth/modules/recovery-token/entities/recover-credentials-token.entity';
import { UserRole } from 'src/resources/auth/modules/role/enum/user-role.enum';

import {
  TestContainersSetup,
  type Containers,
} from '../helpers/testcontainers.setup';
import { REDIS_CLIENT } from 'src/infra/cache/redis.factory';
import { _getCurrentNodeEnv } from '../helpers/ci-cd-env';

const previousNodeEnv = _getCurrentNodeEnv();

// * Note: test only for first release (makes sense for development purposes)
// Actual seed would use sql migration. Test only helps assess if startup is correctly wired up
describe('Seed flow', () => {
  let app: INestApplication<App>;
  let apiClient: TestAgent;
  let containers: Containers;
  let dataSource: DataSource;
  let redisClient: Redis;

  beforeAll(async () => {
    // * Note: using DEBUG makes tests runner run later apparently and no need for timeout
    containers = await TestContainersSetup.setup(5000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bufferLogs: true,
      rawBody: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    process.env.NODE_ENV = previousNodeEnv; // required since some test need production environment
    dataSource = app.get<DataSource>(DataSource);
    redisClient = app.get<Redis>(REDIS_CLIENT);
    apiClient = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await containers.stopAllContainers();
  });

  describe('Sanity check:', () => {
    it('Containers are up', () => {
      const { pgContainer, redisContainer } = containers;
      expect(pgContainer.getName()).toBeDefined();
      expect(redisContainer.getName()).toBeDefined();
    });

    it('Database and cache store connections are working', async () => {
      const query = (await dataSource.query(
        'SELECT version()',
      )) as unknown as any[];

      const redisHello = (await redisClient.hello()) as unknown as any[];
      await redisClient.set('key', 'value');

      expect(query.length).toBe(1);
      expect(query[0]).toEqual({
        version: expect.stringContaining('PostgreSQL 18.1'), // on aarch64-unknown-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit',
      });
      expect(query[0]).toEqual({
        version: expect.stringContaining('Alpine 14.2.0'), // on aarch64-unknown-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit',
      });
      expect(dataSource.isInitialized).toBe(true);
      expect(redisHello.length).not.toBe(0);
      expect(redisHello).toContain('version');
      expect(redisHello).toContain('8.4.0');
      expect(await redisClient.get('key')).toBe('value');
    });
  });

  // * Required for tests that modify env variable
  beforeEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  describe('Expected api call response:', () => {
    it('it should execute (test environment)', async () => {
      const response = await apiClient.get('/api/seed').expect(200);

      expect(response.body).toEqual({ ok: true });
    });

    it('it should execute (development environment)', async () => {
      process.env.NODE_ENV = 'development';

      const response = await apiClient.get('/api/seed').expect(200);

      expect(response.body).toEqual({ ok: true });
    });

    it('it should not execute in production environment', async () => {
      process.env.NODE_ENV = 'production';

      await apiClient.get('/api/seed').expect(400);
    });
  });

  describe('After seed method is called:', () => {
    beforeEach(async () => {
      await apiClient.get('/api/seed').expect(200);
    });

    it('it should initialize database with required entities', () => {
      const expectedEntities = [
        // User related
        User,
        Role,
        RecoveryToken,
      ];

      const entitiesListMetadata = dataSource.entityMetadatas;

      const entitiesNames = entitiesListMetadata
        .map((metadata) => metadata.name)
        .filter((name) => !name.includes('_')); // remove repeated entities declared in name prop for @JoinTable (user_roles)

      expect(expectedEntities.length).toEqual(entitiesNames.length);
      expectedEntities.forEach((entity) => {
        expect(entitiesNames.indexOf(entity.name)).not.toBe(-1);
      });
    });

    it('it should initialize database with required entities for normal functioning', async () => {
      const requiredEntities: [Promise<Role[]>] = [
        dataSource.getRepository(Role).find({}),
      ];

      const [role] = await Promise.all(requiredEntities);

      [...role].forEach((entity) => {
        expect(entity).toBeDefined();
        expect(entity.id).toBeDefined();
      });

      // A more accurate test would involve parsing each specific value, overkill for the time being
      expect(seed.role.length).toEqual(role.length);
    });

    it('it should create at least one user with privilege roles', async () => {
      const { sysadmin } = seed;

      const user = await dataSource.getRepository(User).findOneOrFail({
        where: { email: sysadmin.email },
        relations: {
          roles: true,
        },
      });

      expect(user).toMatchObject({
        id: expect.any(String),
        name: sysadmin.name,
        username: sysadmin.username,
        email: sysadmin.email,
        hash: expect.any(String), // checked in auth
        active: true,
        verifiedAccount: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        roles: [
          expect.objectContaining({
            role: UserRole.SYS_ADMIN,
          }),
        ],
      });
    });
  });
});
