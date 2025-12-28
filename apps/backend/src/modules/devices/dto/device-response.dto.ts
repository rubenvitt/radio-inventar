import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatusEnum } from '@radio-inventar/shared';

/**
 * Response DTO for a single device.
 * Used for Swagger documentation and API contract definition.
 */
export class DeviceResponseDto {
  @ApiProperty({ description: 'Unique device identifier (CUID2)', example: 'cm4abc123def456789012345' })
  id!: string;

  @ApiProperty({ description: 'Radio call sign', example: 'Florian 4-21' })
  callSign!: string;

  @ApiProperty({ description: 'Device serial number', example: 'SN-2021-001', nullable: true })
  serialNumber!: string | null;

  @ApiProperty({ description: 'Type of device', example: 'Handheld' })
  deviceType!: string;

  @ApiProperty({
    description: 'Current device status',
    enum: DeviceStatusEnum.options,
    example: 'AVAILABLE',
  })
  status!: string;

  // M4 Fix: Use @ApiProperty with nullable instead of @ApiPropertyOptional
  // Field is always present but value can be null
  @ApiProperty({ description: 'Additional notes about the device', example: 'Neues Gerät, voller Akku', nullable: true })
  notes!: string | null;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-12-16T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-12-16T10:00:00.000Z' })
  updatedAt!: Date;
}

/**
 * Wrapper DTO for device list responses.
 * All API responses follow the { data: ... } format.
 */
export class DeviceListResponseDto {
  @ApiProperty({ type: [DeviceResponseDto], description: 'Array of devices' })
  data!: DeviceResponseDto[];
}
