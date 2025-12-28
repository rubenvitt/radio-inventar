import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeviceStatusEnum, type DeviceStatus, PAGINATION } from '@radio-inventar/shared';

// Extract enum values from Zod schema for class-validator compatibility
const DEVICE_STATUS_VALUES = DeviceStatusEnum.options;

export class ListDevicesQueryDto {
  @ApiPropertyOptional({
    enum: DEVICE_STATUS_VALUES,
    description: 'Filter nach Gerätestatus',
  })
  @IsOptional()
  @IsEnum(DEVICE_STATUS_VALUES)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    description: `Anzahl der Einträge (max ${PAGINATION.MAX_PAGE_SIZE})`,
    minimum: 1,
    maximum: PAGINATION.MAX_PAGE_SIZE,
    default: PAGINATION.DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_PAGE_SIZE)
  take?: number = PAGINATION.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Anzahl der zu überspringenden Einträge',
    minimum: 0,
    maximum: PAGINATION.MAX_SKIP,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(PAGINATION.MAX_SKIP)
  skip?: number = 0;
}
