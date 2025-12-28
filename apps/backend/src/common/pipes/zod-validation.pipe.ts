import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation pipe for Zod schemas.
 * Validates request body/query/params using Zod schemas.
 *
 * Usage:
 * @UsePipes(new ZodValidationPipe(CreateDeviceSchema))
 * create(@Body() dto: CreateDevice) { ... }
 *
 * Or globally in main.ts:
 * app.useGlobalPipes(new ZodValidationPipe(schema));
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into user-friendly messages
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Bad Request',
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
