import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiQuery,
  ApiParam,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminDevicesService } from './admin-devices.service';
import { PrintTemplateService } from '../services/print-template.service';
import { DeviceResponseDto, DeviceListResponseDto } from '../../devices/dto/device-response.dto';
import { ListDevicesQueryDto } from '../../devices/dto/list-devices.query';
import { ParseCuid2Pipe } from '../../../common/pipes/parse-cuid2.pipe';
import { DeviceStatusEnum, PAGINATION } from '@radio-inventar/shared';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Admin device view — READ-ONLY. Devices are managed in radio-admin; this
 * controller only lists/serves them (composed via DevicesService) plus the
 * print template. Create/update/delete have been removed.
 */
@ApiTags('admin/devices')
@ApiExtraModels(DeviceResponseDto, DeviceListResponseDto)
@UseGuards(SessionAuthGuard)
@Controller('admin/devices')
export class AdminDevicesController {
  private readonly logger = new Logger(AdminDevicesController.name);

  constructor(
    private readonly adminDevicesService: AdminDevicesService,
    private readonly printTemplateService: PrintTemplateService,
  ) {}

  private sanitizeForLog(value: string): string {
    return value.replace(/[\n\r\t\u200B\u200C\u200D\u202A-\u202E\uFEFF\u00AD\u2060\u2028\u2029]/g, '');
  }

  /**
   * Story 6.5: Generate printable device list PDF with QR code.
   * Uses @Res() to bypass TransformInterceptor and send binary PDF directly.
   */
  @Get('print-template')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Druckvorlage als PDF herunterladen' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF erfolgreich generiert' })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  @ApiResponse({ status: 500, description: 'PDF-Generierung fehlgeschlagen' })
  async getPrintTemplate(@Res() res: Response): Promise<void> {
    this.logger.log('GET /api/admin/devices/print-template');

    try {
      const buffer = await this.printTemplateService.generateDeviceListPDF();
      const date = new Date().toISOString().split('T')[0];

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="geraete-liste-${date}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } catch (error) {
      this.logger.error(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(500).json({
        statusCode: 500,
        message: 'PDF-Generierung fehlgeschlagen',
        error: 'Internal Server Error',
      });
    }
  }

  @Get()
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Liste aller Geräte (read-only, aus radio-admin)' })
  @ApiQuery({ name: 'status', required: false, enum: DeviceStatusEnum.options, description: 'Filter nach Gerätestatus' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: `Anzahl der Einträge (max ${PAGINATION.MAX_PAGE_SIZE})` })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Anzahl der zu überspringenden Einträge' })
  @ApiResponse({
    status: 200,
    description: 'Liste der Geräte',
    schema: {
      type: 'object',
      properties: { data: { type: 'array', items: { $ref: getSchemaPath(DeviceResponseDto) } } },
    },
  })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  async findAll(@Query() query: ListDevicesQueryDto): Promise<DeviceResponseDto[]> {
    const sanitizedStatus = query.status ? this.sanitizeForLog(query.status) : undefined;
    const sanitizedTake = typeof query.take === 'number' ? String(query.take) : 'default';
    const sanitizedSkip = typeof query.skip === 'number' ? String(query.skip) : 'default';
    this.logger.log(
      `GET /api/admin/devices?status=${sanitizedStatus ?? 'all'}&take=${sanitizedTake}&skip=${sanitizedSkip}`,
    );
    return this.adminDevicesService.findAll({
      status: query.status,
      take: query.take,
      skip: query.skip,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Einzelnes Gerät abrufen' })
  @ApiParam({ name: 'id', description: 'Geräte-ID (CUID2)', example: 'cm4abc123def456789012345' })
  @ApiResponse({ status: 200, description: 'Gerät gefunden', type: DeviceResponseDto })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  @ApiResponse({ status: 404, description: 'Gerät nicht gefunden' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  async findOne(@Param('id', ParseCuid2Pipe) id: string): Promise<DeviceResponseDto> {
    const sanitizedId = this.sanitizeForLog(id);
    this.logger.log(`GET /api/admin/devices/${sanitizedId}`);
    const device = await this.adminDevicesService.findOne(id);
    if (!device) {
      throw new NotFoundException('Gerät nicht gefunden');
    }
    return device;
  }
}
