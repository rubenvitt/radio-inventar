import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { ListDevicesQueryDto } from './dto/list-devices.query';
import { DeviceResponseDto, DeviceListResponseDto } from './dto/device-response.dto';
import { DeviceStatusEnum, PAGINATION } from '@radio-inventar/shared';
import { Public } from '@/common/decorators';

/**
 * Controller for device management operations.
 * Handles GET /api/devices endpoint.
 */
@Public()
@ApiTags('devices')
@ApiExtraModels(DeviceResponseDto, DeviceListResponseDto)
@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(private readonly devicesService: DevicesService) { }

  @Get()
  @ApiOperation({ summary: 'Liste aller Geräte' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeviceStatusEnum.options,
    description: 'Filter nach Gerätestatus',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: `Anzahl der Einträge (max ${PAGINATION.MAX_PAGE_SIZE})`,
    example: PAGINATION.DEFAULT_PAGE_SIZE,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Anzahl der zu überspringenden Einträge',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste der Geräte',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(DeviceResponseDto) },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültiger Status-Filter oder Pagination-Parameter',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ungültiger Status-Wert' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Interner Serverfehler',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async findAll(@Query() query: ListDevicesQueryDto): Promise<unknown> {
    // Sanitize log input to prevent log injection
    const sanitizedStatus = query.status ? query.status.replace(/[\n\r\t]/g, '') : undefined;
    const sanitizedTake = typeof query.take === 'number' ? query.take : 'default';
    const sanitizedSkip = typeof query.skip === 'number' ? query.skip : 'default';
    this.logger.log(
      `GET /api/devices?status=${sanitizedStatus ?? 'all'}&take=${sanitizedTake}&skip=${sanitizedSkip}`,
    );
    return this.devicesService.findAll({
      status: query.status,
      take: query.take,
      skip: query.skip,
    });
  }
}
