/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// https://stackoverflow.com/questions/54727103/nestjs-how-to-pass-the-error-from-one-error-filter-to-another
// https://stackoverflow.com/questions/58993405/how-can-i-handle-typeorm-error-in-nestjs
// https://auth0.com/blog/forbidden-unauthorized-http-status-codes/
// https://github.com/typeorm/typeorm/tree/master/src/error

// On null return: https://softwareengineering.stackexchange.com/questions/120355/is-it-better-to-return-null-or-empty-values-from-functions-methods-where-the-ret
import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import {
  EntityNotFoundError,
  QueryFailedError,
  TransactionNotStartedError,
  TypeORMError,
  UpdateValuesMissingError,
} from 'typeorm';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { Role } from 'src/resources/auth/modules/role/entities/role.entity';
import {
  INVALID_SIGNUP_USER_VALUES,
  NOT_FOUND_REQUESTED_ENTITY,
} from '../constants/error-messages';
import { type EnvVariables } from 'config/env-variables';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const existingDbEntities = [Role.name];

@Catch()
export class GlobalExceptionsFilter extends BaseExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService<EnvVariables>,
  ) {
    super();
    this.logger.setContext(GlobalExceptionsFilter.name);
  }

  private get allowLogs() {
    return (
      this.configService.get('NODE_ENV') !== 'production' &&
      this.configService.get('NODE_ENV') !== 'ci'
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // ! Change to !== 'production' to check error logs in integration tests
    if (this.allowLogs) {
      this.logger.debug({
        method: request.method,
        path: request.url,
        env: this.configService.get('NODE_ENV'),
        timestamp: new Date().toISOString(),
        constructor: exception?.constructor,
      });
      this.logger.error(exception);
    }

    const errorResponse: {
      message: string;
      error: string;
      statusCode: number;
      details?: any;
    } = {
      message: 'Something went wrong',
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: 'Check logs',
    };

    // * Authentication, Authorization and Validation errors are already handled by BaseExceptionFilter
    if (exception instanceof HttpException) {
      // * Redis error catched here for the time being
      // console.log(Object.entries(exception));
      super.catch(exception, host);
      return;
    } else {
      // * Database connection error
      if (exception instanceof AggregateError) {
        // console.log(exception);
        // console.log(Object.entries(exception));
        // const errors = exception.errors.map((err: unknown) => {
        //   return { code: err.code, };
        // });

        errorResponse.message = exception.name;
        errorResponse.error = exception.errors[0].code;
        errorResponse.details = 'Check database logs';
      }

      // * TypeORM errors
      if (exception instanceof TypeORMError) {
        const parsedMessage = exception.message
          ? exception.message.replace(/(?:\r\n|\r|\n)/g, ' ')
          : 'Missing error message';
        // const serverError = existingDbEntities.some((name) =>
        //   exception.message.includes(name),
        // );

        if (exception instanceof TransactionNotStartedError) {
          // console.log(Object.entries(exception.driverError));
          errorResponse.message = parsedMessage;
          errorResponse.statusCode = HttpStatus.BAD_REQUEST;
          errorResponse.error = exception.name;
        }

        if (exception instanceof QueryFailedError) {
          // console.log(Object.entries(exception.driverError));
          errorResponse.message = parsedMessage;
          errorResponse.statusCode = HttpStatus.BAD_REQUEST;
          errorResponse.error = exception.name;
          errorResponse.details = {
            detail: exception.driverError.detail,
            field: exception.driverError.table,
          };

          // * User create
          if (
            exception.driverError?.detail?.includes('username') ||
            exception.driverError?.detail?.includes('email')
          ) {
            errorResponse.message = INVALID_SIGNUP_USER_VALUES;
            errorResponse.details = {
              detail: exception.driverError.detail,
              field: exception.driverError.table,
            };
          }
        }

        if (exception instanceof EntityNotFoundError) {
          errorResponse.message = exception.message.split('matching')[0];
          errorResponse.error = exception.name;
          errorResponse.details = NOT_FOUND_REQUESTED_ENTITY;
          errorResponse.statusCode = HttpStatus.BAD_REQUEST;
        }

        if (exception instanceof UpdateValuesMissingError) {
          errorResponse.message = exception.message;
          errorResponse.error = exception.name;
        }
      }

      // * Cache errors (token related)
      if (
        exception instanceof TokenExpiredError ||
        exception instanceof JsonWebTokenError
      ) {
        // * Auth errors
        errorResponse.message = exception.message;
        errorResponse.error = exception.name;
        errorResponse.statusCode = HttpStatus.UNAUTHORIZED;
        delete errorResponse.details;
      }

      response.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
