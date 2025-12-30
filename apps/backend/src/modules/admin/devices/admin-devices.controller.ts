import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
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
  ApiBody,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminDevicesService } from './admin-devices.service';
import { PrintTemplateService } from '../services/print-template.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';
import { DeviceResponseDto, DeviceListResponseDto } from '../../devices/dto/device-response.dto';
import { ListDevicesQueryDto } from '../../devices/dto/list-devices.query';
import { ParseCuid2Pipe } from '../../../common/pipes/parse-cuid2.pipe';
import { DeviceStatusEnum, PAGINATION } from '@radio-inventar/shared';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';

/**
 * FIX M10: Helper function to check if running in test environment
 * Encapsulates the NODE_ENV check for better testability and cleaner code
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Controller for admin device management operations.
 * Handles CRUD operations for devices.
 * FIX C1: Added @UseGuards(SessionAuthGuard) - was missing, only had comment!
 */
@ApiTags('admin/devices')
@ApiExtraModels(DeviceResponseDto, DeviceListResponseDto, CreateDeviceDto, UpdateDeviceDto, UpdateDeviceStatusDto)
@UseGuards(SessionAuthGuard)
@Controller('admin/devices')
export class AdminDevicesController {
  private readonly logger = new Logger(AdminDevicesController.name);

  constructor(
    private readonly adminDevicesService: AdminDevicesService,
    private readonly printTemplateService: PrintTemplateService,
  ) {}

  /**
   * Sanitizes string values for logging to prevent log injection attacks.
   * Removes newlines, tabs, zero-width spaces, directional formatting characters,
   * soft hyphens, word joiners, and line/paragraph separators.
   */
  private sanitizeForLog(value: string): string {
    return value.replace(/[\n\r\t\u200B\u200C\u200D\u202A-\u202E\uFEFF\u00AD\u2060\u2028\u2029]/g, '');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Neues Gerät erstellen' })
  @ApiBody({ type: CreateDeviceDto })
  @ApiResponse({
    status: 201,
    description: 'Gerät erfolgreich erstellt',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Eingabedaten',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['callSign should not be empty'] },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Funkruf existiert bereits',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Funkruf existiert bereits' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  async create(@Body() body: unknown): Promise<DeviceResponseDto> {
    // Validate and sanitize input using Zod schema
    const dto = CreateDeviceDto.validate(body);

    // Sanitize log input to prevent log injection
    const sanitizedCallSign = this.sanitizeForLog(dto.callSign);
    this.logger.log(`POST /api/admin/devices callSign=${sanitizedCallSign}`);
    // TransformInterceptor wraps response in { data: ... }
    return this.adminDevicesService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Gerät aktualisieren' })
  @ApiParam({
    name: 'id',
    description: 'Geräte-ID (CUID2)',
    example: 'cm4abc123def456789012345',
  })
  @ApiBody({ type: UpdateDeviceDto })
  @ApiResponse({
    status: 200,
    description: 'Gerät erfolgreich aktualisiert',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Eingabedaten oder ID-Format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ungültiges ID-Format' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 404,
    description: 'Gerät nicht gefunden',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Gerät nicht gefunden' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Funkruf existiert bereits',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Funkruf existiert bereits' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  async update(
    @Param('id', ParseCuid2Pipe) id: string,
    @Body() body: unknown,
  ): Promise<DeviceResponseDto> {
    // Validate and sanitize input using Zod schema
    const dto = UpdateDeviceDto.validate(body);

    // Check if DTO is empty (no fields to update)
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Keine Felder zum Aktualisieren angegeben');
    }

    // Sanitize log input to prevent log injection
    const sanitizedId = this.sanitizeForLog(id);
    const sanitizedCallSign = dto.callSign ? this.sanitizeForLog(dto.callSign) : 'unchanged';
    this.logger.log(`PATCH /api/admin/devices/${sanitizedId} callSign=${sanitizedCallSign}`);
    // TransformInterceptor wraps response in { data: ... }
    return this.adminDevicesService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Gerätestatus aktualisieren' })
  @ApiParam({
    name: 'id',
    description: 'Geräte-ID (CUID2)',
    example: 'cm4abc123def456789012345',
  })
  @ApiBody({ type: UpdateDeviceStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Gerätestatus erfolgreich aktualisiert',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültiger Status oder ID-Format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Status muss AVAILABLE, DEFECT oder MAINTENANCE sein' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 404,
    description: 'Gerät nicht gefunden',
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  async updateStatus(
    @Param('id', ParseCuid2Pipe) id: string,
    @Body() body: unknown,
  ): Promise<DeviceResponseDto> {
    // Validate input using Zod enum
    const dto = UpdateDeviceStatusDto.validate(body);

    // Sanitize log input to prevent log injection
    const sanitizedId = this.sanitizeForLog(id);
    const sanitizedStatus = this.sanitizeForLog(dto.status);
    this.logger.log(`PATCH /api/admin/devices/${sanitizedId}/status status=${sanitizedStatus}`);
    // TransformInterceptor wraps response in { data: ... }
    return this.adminDevicesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 10, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gerät löschen' })
  @ApiParam({
    name: 'id',
    description: 'Geräte-ID (CUID2)',
    example: 'cm4abc123def456789012345',
  })
  @ApiResponse({
    status: 204,
    description: 'Gerät erfolgreich gelöscht',
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültiges ID-Format',
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 404,
    description: 'Gerät nicht gefunden',
  })
  @ApiResponse({
    status: 409,
    description: 'Gerät kann nicht gelöscht werden, da es ausgeliehen ist (ohne force=1)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Gerät kann nicht gelöscht werden, da es ausgeliehen ist' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: String,
    description: 'Mit "1" oder "true" kann ein ausgeliehenes Gerät gelöscht werden',
    example: '1',
  })
  async delete(
    @Param('id', ParseCuid2Pipe) id: string,
    @Query('force') force?: string,
  ): Promise<void> {
    const forceDelete = force === '1' || force === 'true';
    // Sanitize log input to prevent log injection
    const sanitizedId = this.sanitizeForLog(id);
    this.logger.log(`DELETE /api/admin/devices/${sanitizedId} force=${forceDelete}`);
    await this.adminDevicesService.delete(id, { force: forceDelete });
  }

  /**
   * Story 6.5: Generate printable device list PDF with QR code.
   * Uses @Res() to bypass TransformInterceptor and send binary PDF directly.
   */
  @Get('print-template')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Druckvorlage als PDF herunterladen' })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF erfolgreich generiert',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  @ApiResponse({
    status: 500,
    description: 'PDF-Generierung fehlgeschlagen',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'PDF-Generierung fehlgeschlagen' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getPrintTemplate(@Res() res: Response): Promise<void> {
    this.logger.log('GET /api/admin/devices/print-template');

    try {
      const buffer = await this.printTemplateService.generateDeviceListPDF();
      const date = new Date().toISOString().split('T')[0];

      // CRITICAL: Use @Res() and res.send() to bypass TransformInterceptor
      // which would otherwise wrap the response in { data: ... }
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
  @ApiOperation({ summary: 'Liste aller Geräte mit Pagination' })
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
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  async findAll(@Query() query: ListDevicesQueryDto): Promise<DeviceResponseDto[]> {
    // Sanitize log input to prevent log injection
    const sanitizedStatus = query.status ? this.sanitizeForLog(query.status) : undefined;
    const sanitizedTake = typeof query.take === 'number' ? String(query.take) : 'default';
    const sanitizedSkip = typeof query.skip === 'number' ? String(query.skip) : 'default';
    this.logger.log(
      `GET /api/admin/devices?status=${sanitizedStatus ?? 'all'}&take=${sanitizedTake}&skip=${sanitizedSkip}`,
    );
    // TransformInterceptor wraps response in { data: ... }
    return this.adminDevicesService.findAll({
      status: query.status,
      take: query.take,
      skip: query.skip,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Einzelnes Gerät abrufen' })
  @ApiParam({
    name: 'id',
    description: 'Geräte-ID (CUID2)',
    example: 'cm4abc123def456789012345',
  })
  @ApiResponse({
    status: 200,
    description: 'Gerät gefunden',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültiges ID-Format',
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert',
  })
  @ApiResponse({
    status: 404,
    description: 'Gerät nicht gefunden',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Gerät nicht gefunden' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Zu viele Anfragen',
  })
  async findOne(@Param('id', ParseCuid2Pipe) id: string): Promise<DeviceResponseDto> {
    // Sanitize log input to prevent log injection
    const sanitizedId = this.sanitizeForLog(id);
    this.logger.log(`GET /api/admin/devices/${sanitizedId}`);
    const device = await this.adminDevicesService.findOne(id);
    if (!device) {
      throw new NotFoundException('Gerät nicht gefunden');
    }
    // TransformInterceptor wraps response in { data: ... }
    return device;
  }
}
