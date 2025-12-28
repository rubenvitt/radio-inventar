import { ApiProperty } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { ZodError } from 'zod';
import {
  DeviceStatusAdminUpdateEnum,
  type DeviceStatusAdminUpdate,
} from '@radio-inventar/shared';

/**
 * DTO for updating device status.
 *
 * ## Dual Validation Approach (AC6 Compliance)
 * This DTO uses BOTH class-validator and Zod for different purposes:
 *
 * 1. **class-validator decorators** (@IsEnum):
 *    - Used by NestJS ValidationPipe for HTTP layer validation
 *    - Provides automatic request validation before reaching controller
 *    - Enables Swagger/OpenAPI auto-generation of validation rules
 *
 * 2. **Zod enum validation** (DeviceStatusAdminUpdateEnum from @radio-inventar/shared):
 *    - Used for business logic validation via static validate() method
 *    - Ensures consistency across frontend and backend
 *    - Single source of truth for valid status values
 *
 * ## Status Rules
 * - Excludes ON_LOAN which cannot be set via admin endpoint
 * - ON_LOAN status is managed automatically by the loan system
 * - Valid values: AVAILABLE, DEFECT, MAINTENANCE
 *
 * ## Usage in Controllers
 * Controllers should call UpdateDeviceStatusDto.validate() to get Zod-validated data:
 * ```typescript
 * @Patch(':id/status')
 * async updateStatus(@Param('id') id: string, @Body() body: UpdateDeviceStatusDto) {
 *   const validated = UpdateDeviceStatusDto.validate(body);
 *   return this.service.updateStatus(id, validated.status);
 * }
 * ```
 *
 * @see DeviceStatusAdminUpdateEnum - Zod enum from shared package
 */
export class UpdateDeviceStatusDto {
  @ApiProperty({
    description:
      'Gerätestatus. CRITICAL: ON_LOAN kann nicht über diesen Endpoint gesetzt werden - wird automatisch vom Ausleihsystem verwaltet.',
    enum: DeviceStatusAdminUpdateEnum.options,
    example: 'AVAILABLE',
  })
  @IsEnum(DeviceStatusAdminUpdateEnum.options, {
    message: `status must be one of: ${DeviceStatusAdminUpdateEnum.options.join(', ')}`,
  })
  status!: DeviceStatusAdminUpdate;

  /**
   * Validates status using Zod enum from @radio-inventar/shared.
   *
   * This method provides business logic validation using the shared Zod enum,
   * ensuring only valid admin-settable statuses are accepted.
   *
   * @param input - Raw input data to validate
   * @returns Validated UpdateDeviceStatusDto object
   * @throws {BadRequestException} When validation fails
   */
  static validate(input: unknown): UpdateDeviceStatusDto {
    try {
      // Validate that input is an object with status field
      if (!input || typeof input !== 'object' || !('status' in input)) {
        throw new BadRequestException('status: Erforderliches Feld fehlt');
      }

      const status = DeviceStatusAdminUpdateEnum.parse((input as { status: unknown }).status);
      return { status };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof ZodError) {
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : `status: ${err.message}`;
        });
        throw new BadRequestException(messages);
      }
      throw new BadRequestException('Ungültiger Status');
    }
  }
}
