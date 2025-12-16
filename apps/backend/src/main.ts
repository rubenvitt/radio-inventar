import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';

// Create logger once at module level to avoid double instantiation
const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get ConfigService for type-safe configuration access
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 3000;

    // Security: Enable Helmet for security headers
    app.use(helmet());

    // Request body size limits (explicit, default 100kb is too permissive)
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // CORS configuration using ConfigService
    const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS') ?? '';
    const corsOrigins = allowedOrigins
      ? allowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    // Security: In non-production, if no origins configured, use explicit localhost defaults
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const finalCorsOrigins = corsOrigins.length > 0
      ? corsOrigins
      : isProduction
        ? [] // No origins in production
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

    app.enableCors({
      origin: finalCorsOrigins.length === 0 ? false : finalCorsOrigins,
      credentials: true,
    });

    // Global validation pipe for automatic DTO validation with DoS protection
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        // Security: Disable error messages in production to prevent enumeration attacks
        disableErrorMessages: isProduction,
      }),
    );

    app.setGlobalPrefix('api');
    await app.listen(port);
    app.enableShutdownHooks();
    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    // Security: Only log error message, not full stack trace to prevent information leakage
    logger.error(`Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
bootstrap().catch((error) => {
  // Security: Only log error message, not full stack trace to prevent information leakage
  logger.error(`Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
