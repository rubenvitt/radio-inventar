import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatusEnum } from '@radio-inventar/shared';

/**
 * Response DTO for a single device.
 * Used for Swagger documentation and API contract definition.
 */
export class DeviceResponseDto {
  @ApiProperty({ description: 'Unique device identifier (radio-admin cuid2)', example: 'cm4abc123def456789012345' })
  id!: string;

  @ApiProperty({ description: 'Radio call sign (rufname; falls back to issi)', example: 'Florian 4-21' })
  callSign!: string;

  @ApiProperty({ description: 'Device serial number', example: 'SN-2021-001', nullable: true })
  serialNumber!: string | null;

  @ApiProperty({ description: 'Type of device', example: 'Handheld', nullable: true })
  deviceType!: string | null;

  // Composed: ON_LOAN when an active local loan exists, otherwise derived from
  // radio-admin's condition (DEFECT/MAINTENANCE) or AVAILABLE.
  @ApiProperty({
    description: 'Current device status',
    enum: DeviceStatusEnum.options,
    example: 'AVAILABLE',
  })
  status!: string;
}

/**
 * Wrapper DTO for device list responses.
 * All API responses follow the { data: ... } format.
 */
export class DeviceListResponseDto {
  @ApiProperty({ type: [DeviceResponseDto], description: 'Array of devices' })
  data!: DeviceResponseDto[];
}
