// lookup: testcontainers nestjs integration testing
// https://www.blockydevs.com/blog/nestjs-integration-testing-with-testcontainers#:~:text=The%20most%20important%20goal%20of,and%20processing%20online%20shop%20orders.
// https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/#:~:text=Testcontainers%20is%20a%20testing%20library,testcontainers/postgresql%20%2D%2Dsave%2Ddev
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Wait } from 'testcontainers';

export type Containers = {
  pgContainer: StartedPostgreSqlContainer;
  redisContainer: StartedRedisContainer;
  stopAllContainers: () => Promise<void>;
};

export class TestContainersSetup {
  public static async setup(timeoutMs: number = 0): Promise<Containers> {
    const pgContainer = await new PostgreSqlContainer(
      'postgres:18.1-alpine3.22',
    )
      .withExposedPorts(5432)
      .withHostname('127.0.0.1')
      .withWaitStrategy(
        Wait.forLogMessage('database system is ready to accept connections'),
      )
      .withStartupTimeout(180000) // cold start take longer due to pull images in local testing
      .start();

    const redisContainer = await new RedisContainer('redis:8.4.0-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    // Dynamically set environment variables or override ConfigService providers
    process.env.DB_HOST = pgContainer.getHost();
    process.env.DB_PORT = pgContainer.getPort().toString();
    process.env.DB_USERNAME = pgContainer.getUsername();
    process.env.DB_PASSWORD = pgContainer.getPassword();
    process.env.DB_NAME = pgContainer.getDatabase();

    process.env.REDIS_STORE_HOST = redisContainer.getHost();
    process.env.REDIS_STORE_PORT = redisContainer
      .getMappedPort(6379)
      .toString();

    // Required to wait for database to be ready for connections before test runner starts
    // Should be below 10s to avoid hookTimeout conflicts (or modify hookTimeout in vitest.config)
    if (timeoutMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    }

    return {
      pgContainer,
      redisContainer,
      stopAllContainers: async () => {
        await Promise.all([pgContainer.stop(), redisContainer.stop()]);
      },
    };
  }
}
