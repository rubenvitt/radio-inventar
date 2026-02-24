import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';

/**
 * API error response format per Architecture specification
 */
interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp?: string;
  path?: string;
}

/**
 * Type guard to check if value is a plain object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Sanitize path to remove ANSI escape sequences, path traversal sequences, and non-printable characters
    const safePath = request.path
      .replace(/\.\./g, '') // Remove path traversal sequences
      .replace(/[^\x20-\x7E]/g, ''); // Remove ANSI and non-printable characters

    // Extract and sanitize request correlation ID for attack tracing
    // Only allow alphanumeric characters and hyphens (1-64 chars) to prevent log injection
    const rawRequestId = request.headers['x-request-id'] as string | undefined;
    const requestId = rawRequestId?.match(/^[a-zA-Z0-9-]{1,64}$/)?.[0] ?? undefined;

    // Log error with method, path, and request ID (no sensitive request data)
    this.logger.error(
      `${request.method} ${safePath} - ${status}${requestId ? ` [RequestID: ${requestId}]` : ''}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Extract error details following Architecture ApiError interface
    let message: string;
    let error: string | undefined;
    let errors: Array<{ field: string; message: string }> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (isRecord(exceptionResponse)) {
      const resp = exceptionResponse;
      message = typeof resp.message === 'string'
        ? resp.message
        : Array.isArray(resp.message)
          ? resp.message.join(', ')
          : 'An error occurred';
      error = typeof resp.error === 'string' ? resp.error : undefined;

      // Handle validation errors from class-validator
      if (Array.isArray(resp.message)) {
        errors = resp.message.map((msg: string) => {
          // class-validator messages often have format: "fieldName must be..."
          const fieldMatch = msg.match(/^(\w+)\s/);
          const field: string = fieldMatch?.[1] ?? 'unknown';
          return {
            field,
            message: msg,
          };
        });
      }
    } else {
      message = 'Internal server error';
    }

    const errorResponse: ApiError = {
      statusCode: status,
      message,
      ...(error && { error }),
      ...(errors && { errors }),
      ...(!isProduction && {
        timestamp: new Date().toISOString(),
        path: safePath,
      }),
    };

    // Check if headers were already sent to avoid "Cannot set headers after they are sent to client" error
    if (!response.headersSent) {
      response.status(status).json(errorResponse);
    }
  }
}
