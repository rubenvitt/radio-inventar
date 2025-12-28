import { ApiPropertyOptional } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ZodError } from 'zod';
import { DEVICE_FIELD_LIMITS, UpdateDeviceSchema } from '@radio-inventar/shared';
import { sanitizeString } from '../../../../common/utils';

/**
 * Input type for updating devices - compatible with UpdateDeviceInput from repository.
 * Uses optional fields without undefined to match exactOptionalPropertyTypes.
 */
export interface UpdateDeviceInput {
  callSign?: string;
  serialNumber?: string | null;
  deviceType?: string;
  notes?: string | null;
}

/**
 * DTO for updating an existing device.
 *
 * ## Dual Validation Approach (AC6 Compliance)
 * This DTO uses BOTH class-validator and Zod for different purposes:
 *
 * 1. **class-validator decorators** (@IsString, @IsOptional, etc.):
 *    - Used by NestJS ValidationPipe for HTTP layer validation
 *    - Provides automatic request validation before reaching controller
 *    - Enables Swagger/OpenAPI auto-generation of validation rules
 *
 * 2. **Zod schema validation** (UpdateDeviceSchema from @radio-inventar/shared):
 *    - Used for business logic validation via static validate() method
 *    - Ensures consistency across frontend and backend
 *    - Provides advanced sanitization (Unicode normalization, zero-width char removal)
 *    - Single source of truth for validation rules
 *
 * All fields are optional - only provided fields will be updated.
 *
 * ## Usage in Controllers
 * Controllers should call UpdateDeviceDto.validate() to get Zod-validated data:
 * ```typescript
 * @Patch(':id')
 * async update(@Param('id') id: string, @Body() body: UpdateDeviceDto) {
 *   const validated = UpdateDeviceDto.validate(body);
 *   return this.service.update(id, validated);
 * }
 * ```
 *
 * @see UpdateDeviceSchema - Zod schema from shared package
 * @see sanitizeString - Utility function for input sanitization
 */
export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: 'Funkrufname des Geräts (z.B. "Florian 4-23")',
    example: 'Florian 4-23',
    minLength: 1,
    maxLength: DEVICE_FIELD_LIMITS.CALL_SIGN_MAX,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX)
  callSign?: string;

  @ApiPropertyOptional({
    description: 'Seriennummer des Geräts',
    example: 'SN-2025-042',
    maxLength: DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX)
  serialNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Gerätetyp/-modell (z.B. "Handheld", "Mobile", "Base Station")',
    example: 'Handheld',
    minLength: 1,
    maxLength: DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX)
  deviceType?: string;

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
   * - Structure validation (UpdateDeviceSchema)
   * - String sanitization (Unicode normalization, zero-width char removal)
   * - Length validation after normalization
   * - Proper handling of optional fields
   *
   * @param input - Raw input data to validate
   * @returns Validated and sanitized UpdateDeviceInput object
   * @throws {BadRequestException} When validation fails
   */
  static validate(input: unknown): UpdateDeviceInput {
    try {
      // First validate structure with Zod
      const validated = UpdateDeviceSchema.parse(input);

      // Then apply additional sanitization (Unicode normalization, zero-width char removal)
      // Build result object with only defined fields to maintain correct optional semantics
      const result: UpdateDeviceInput = {};

      if (validated.callSign !== undefined) {
        result.callSign = sanitizeString(validated.callSign, {
          maxLength: DEVICE_FIELD_LIMITS.CALL_SIGN_MAX
        }) as string;
      }

      if (validated.serialNumber !== undefined) {
        result.serialNumber = validated.serialNumber
          ? sanitizeString(validated.serialNumber, {
              maxLength: DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX,
              emptyToNull: true,
            })
          : null;
      }

      if (validated.deviceType !== undefined) {
        result.deviceType = sanitizeString(validated.deviceType, {
          maxLength: DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX
        }) as string;
      }

      if (validated.notes !== undefined) {
        result.notes = validated.notes
          ? sanitizeString(validated.notes, {
              maxLength: DEVICE_FIELD_LIMITS.NOTES_MAX,
              emptyToNull: true,
            })
          : null;
      }

      return result;
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
