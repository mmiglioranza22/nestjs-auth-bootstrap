// https://stackoverflow.com/questions/65486947/nestjs-transform-a-property-using-validationpipe-before-validation-execution-dur
import { config } from '@dotenvx/dotenvx';

config({
  path: `./config/.env.${process.env.NODE_ENV}`,
  strict: true,
});

import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger as NestLogger } from '@nestjs/common';

import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Swagger
import { UserModule } from './resources/user/user.module';
import { AuthModule } from './resources/auth/auth.module';
import { API_TAG } from './swagger/constants';
import { SeedModule } from './_seed/seed.module';
import { AUTHENTICATION_COOKIE } from './resources/auth/constants';

const isNotProd = process.env.NODE_ENV !== 'production';

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const logger = new NestLogger('Bootstrap');
  app.setGlobalPrefix('api');

  app.use(helmet());

  app.enableCors({
    origin: isNotProd ? true : 'https://app.example.com',
  });
  app.useBodyParser('json', { limit: '10mb' });

  app.use(cookieParser(process.env.COOKIE_SECRET, {}));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('NestJS Auth bootstrap')
    .setDescription(
      'Authentication and authorization template solution for your NestJS projects',
    )
    .setVersion('1.0')
    .addBearerAuth(undefined, 'accessToken')
    .addCookieAuth(AUTHENTICATION_COOKIE)
    .addTag(API_TAG.Auth.name, API_TAG.Auth.description)
    .addTag(API_TAG.User.name, API_TAG.User.name)
    .build();

  const options: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    include: [SeedModule, AuthModule, UserModule],
  };

  const documentFactory = SwaggerModule.createDocument(app, config, options);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
    swaggerOptions: {
      operationsSorter: 'alpha',
    },
  });

  const PORT = process.env.PORT ?? 3000;

  await app.listen(PORT);
  logger.log(`App running on port ${PORT}`);
}

void bootstrap();
