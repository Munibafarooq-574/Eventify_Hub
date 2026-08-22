//file: fyp-backend/src/main.ts
/*import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.error('===== UNHANDLED EXCEPTION START =====');
    console.error(exception);
    console.error('===== UNHANDLED EXCEPTION END =====');

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception instanceof HttpException ? exception.getResponse() : (exception?.message || 'Internal server error');

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();*/

//file: fyp-backend/src/main.ts
import * as dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';

import {
  ValidationPipe,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

import { AppModule } from './app.module';

import { join } from 'path';

import { NestExpressApplication } from '@nestjs/platform-express';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.error('===== UNHANDLED EXCEPTION START =====');
    console.error(exception);
    console.error('===== UNHANDLED EXCEPTION END =====');

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : 500;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception?.message || 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded media from /public/*
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  app.useGlobalPipes(new ValidationPipe());

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors();

  const port = process.env.PORT || 3000;

  const server = await app.listen(port, '0.0.0.0');

  // Allow large/slow video uploads
  server.setTimeout(5 * 60 * 1000);

  console.log(`Server running on port ${port}`);
}

bootstrap();
