import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ZodError } from 'zod';
import { DEVICE_FIELD_LIMITS, CreateDeviceSchema, type CreateDevice } from '@radio-inventar/shared';
import { sanitizeString } from '../../../../common/utils';

/**
 * DTO for creating a new device.
 *
 * ## Dual Validation Approach (AC6 Compliance)
 * This DTO uses BOTH class-validator and Zod for different purposes:
 *
 * 1. **class-validator decorators** (@IsString, @IsNotEmpty, etc.):
 *    - Used by NestJS ValidationPipe for HTTP layer validation
 *    - Provides automatic request validation before reaching controller
 *    - Enables Swagger/OpenAPI auto-generation of validation rules
 *
 * 2. **Zod schema validation** (CreateDeviceSchema from @radio-inventar/shared):
 *    - Used for business logic validation via static validate() method
 *    - Ensures consistency across frontend and backend
 *    - Provides advanced sanitization (Unicode normalization, zero-width char removal)
 *    - Single source of truth for validation rules
 *
 * ## Usage in Controllers
 * Controllers should call CreateDeviceDto.validate() to get Zod-validated data:
 * ```typescript
 * @Post()
 * async create(@Body() body: CreateDeviceDto) {
 *   const validated = CreateDeviceDto.validate(body);
 *   return this.service.create(validated);
 * }
 * ```
 *
 * @see CreateDeviceSchema - Zod schema from shared package
 * @see sanitizeString - Utility function for input sanitization
 * @see DEVICE_FIELD_LIMITS - Field length constraints from shared package
 */
export class CreateDeviceDto {
  @ApiProperty({
    description: 'Funkrufname des Geräts (z.B. "Florian 4-23")',
    example: 'Florian 4-23',
    minLength: 1,
    maxLength: DEVICE_FIELD_LIMITS.CALL_SIGN_MAX,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX)
  callSign!: string;

  @ApiPropertyOptional({
    description: 'Seriennummer des Geräts',
    example: 'SN-2025-042',
    maxLength: DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX)
  serialNumber?: string | null;

  @ApiProperty({
    description: 'Gerätetyp/-modell (z.B. "Handheld", "Mobile", "Base Station")',
    example: 'Handheld',
    minLength: 1,
    maxLength: DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX)
  deviceType!: string;

  @ApiPropertyOptional({
    description: 'Zusätzliche Anmerkungen zum Gerät',
    example: 'Neu gekauft im Dezember 2025',
    maxLength: DEVICE_FIELD_LIMITS.NOTES_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(DEVICE_FIELD_LIMITS.NOTES_MAX)
  notes?: string | null;

  /**
   * Validates and sanitizes input using Zod schema from @radio-inventar/shared.
   *
   * This method provides business logic validation using the shared Zod schema,
   * which includes:
   * - Structure validation (CreateDeviceSchema)
   * - String sanitization (Unicode normalization, zero-width char removal)
   * - Length validation after normalization
   *
   * @param input - Raw input data to validate
   * @returns Validated and sanitized CreateDevice object
   * @throws {BadRequestException} When validation fails
   */
  static validate(input: unknown): CreateDevice {
    try {
      // First validate structure with Zod
      const validated = CreateDeviceSchema.parse(input);

      // Then apply additional sanitization (Unicode normalization, zero-width char removal)
      return {
        callSign: sanitizeString(validated.callSign, {
          maxLength: DEVICE_FIELD_LIMITS.CALL_SIGN_MAX
        }) as string,
        serialNumber: validated.serialNumber
          ? sanitizeString(validated.serialNumber, {
              maxLength: DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX,
              emptyToNull: true,
            })
          : null,
        deviceType: sanitizeString(validated.deviceType, {
          maxLength: DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX
        }) as string,
        notes: validated.notes
          ? sanitizeString(validated.notes, {
              maxLength: DEVICE_FIELD_LIMITS.NOTES_MAX,
              emptyToNull: true,
            })
          : null,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new BadRequestException(messages);
      }
      throw error;
    }
  }
}
