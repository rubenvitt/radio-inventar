import {
  Controller,
  Get,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { HistoryService } from './history.service';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';

/**
 * Helper function to check if running in test environment
 * Allows higher rate limits in tests to avoid flaky test failures
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Controller for admin dashboard and history endpoints.
 * All endpoints require admin authentication via SessionAuthGuard.
 *
 * @remarks
 * - Dashboard endpoint (GET /dashboard): Rate limited to 30 req/min (expensive aggregation)
 * - History endpoint (GET /history): Rate limited to 20 req/min (large result sets)
 * - Both endpoints protected by SessionAuthGuard at class level
 */
@ApiTags('admin/history')
@Controller('admin/history')
@UseGuards(SessionAuthGuard) // CRITICAL: Admin authentication required for all endpoints
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private readonly historyService: HistoryService) {}

  /**
   * Get dashboard statistics and active loans
   *
   * @returns Device counts by status and up to 50 active loans
   *
   * @example
   * GET /api/admin/history/dashboard
   *
   * Response:
   * {
   *   "data": {
   *     "availableCount": 5,
   *     "onLoanCount": 2,
   *     "defectCount": 1,
   *     "maintenanceCount": 0,
   *     "activeLoans": [
   *       {
   *         "id": "clh...",
   *         "device": { "callSign": "Florian 4-23", "deviceType": "Funkgerät" },
   *         "borrowerName": "Max Mustermann",
   *         "borrowedAt": "2025-12-23T10:30:00.000Z"
   *       }
   *     ]
   *   }
   * }
   */
  @Get('dashboard')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 30, ttl: 60000 } }) // 30 req/min (test: 100)
  @ApiOperation({
    summary: 'Admin Dashboard Statistiken abrufen',
    description: 'Liefert Gerätestatistiken (verfügbar/ausgeliehen/defekt/wartung) und aktuell ausgeliehene Geräte (max 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard-Daten erfolgreich abgerufen',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            availableCount: { type: 'number', example: 5 },
            onLoanCount: { type: 'number', example: 2 },
            defectCount: { type: 'number', example: 1 },
            maintenanceCount: { type: 'number', example: 0 },
            activeLoans: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clh1234567890' },
                  device: {
                    type: 'object',
                    properties: {
                      callSign: { type: 'string', example: 'Florian 4-23' },
                      deviceType: { type: 'string', example: 'Funkgerät' },
                    },
                  },
                  borrowerName: { type: 'string', example: 'Max Mustermann' },
                  borrowedAt: { type: 'string', format: 'date-time', example: '2025-12-23T10:30:00.000Z' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert - Admin-Session erforderlich',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getDashboard() {
    this.logger.debug('GET /admin/history/dashboard');
    return await this.historyService.getDashboardStats();
  }

  /**
   * Get paginated loan history with optional filters
   *
   * @param deviceId - Optional: Filter by device ID (CUID format)
   * @param from - Optional: Start date (ISO 8601)
   * @param to - Optional: End date (ISO 8601)
   * @param page - Optional: Page number (default: 1)
   * @param pageSize - Optional: Items per page (default: 100, max: 1000)
   * @returns Paginated history with metadata
   *
   * @example
   * GET /api/admin/history/history?page=1&pageSize=100&deviceId=clh123&from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z
   *
   * Response:
   * {
   *   "data": [
   *     {
   *       "id": "clh...",
   *       "device": { "id": "clh...", "callSign": "Florian 4-23", "deviceType": "Funkgerät", "status": "ON_LOAN" },
   *       "borrowerName": "Max Mustermann",
   *       "borrowedAt": "2025-12-23T10:30:00.000Z",
   *       "returnedAt": null,
   *       "returnNote": null
   *     }
   *   ],
   *   "meta": {
   *     "total": 42,
   *     "page": 1,
   *     "pageSize": 100,
   *     "totalPages": 1
   *   }
   * }
   */
  @Get('history')
  @Throttle({ default: { limit: isTestEnvironment() ? 100 : 20, ttl: 60000 } }) // 20 req/min (test: 100)
  @ApiOperation({
    summary: 'Ausleihe-Historie abrufen',
    description: 'Liefert paginierte Ausleihe-Historie mit optionalen Filtern (Gerät, Zeitraum)',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    type: String,
    description: 'Geräte-ID im CUID-Format (25 Zeichen)',
    example: 'clh1234567890abcdefghijk',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Startdatum im ISO 8601 Format',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Enddatum im ISO 8601 Format',
    example: '2025-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Seitennummer (Standard: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Anzahl Einträge pro Seite (Standard: 100, Maximum: 1000)',
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Historie erfolgreich abgerufen',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clh1234567890' },
              device: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clh9876543210' },
                  callSign: { type: 'string', example: 'Florian 4-23' },
                  deviceType: { type: 'string', example: 'Funkgerät' },
                  status: { type: 'string', example: 'ON_LOAN', enum: ['AVAILABLE', 'ON_LOAN', 'DEFECT', 'MAINTENANCE'] },
                },
              },
              borrowerName: { type: 'string', example: 'Max Mustermann' },
              borrowedAt: { type: 'string', format: 'date-time', example: '2025-12-23T10:30:00.000Z' },
              returnedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
              returnNote: { type: 'string', nullable: true, example: null },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 42 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Parameter (z.B. ungültiges Datumsformat, deviceId-Format, oder Datumsbereich > 365 Tage)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht authentifiziert - Admin-Session erforderlich',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getHistory(
    @Query('deviceId') deviceId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.logger.debug(`GET /admin/history/history?deviceId=${deviceId || 'all'}&page=${page || 1}&pageSize=${pageSize || 100}&from=${from || 'none'}&to=${to || 'none'}`);

    // Date validation happens in Service via HistoryFiltersSchema
    // Pass all parameters (undefined values will be handled by HistoryFiltersSchema defaults)
    return await this.historyService.getHistory({
      ...(deviceId !== undefined && { deviceId }),
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
      ...(page !== undefined && { page }),
      ...(pageSize !== undefined && { pageSize }),
    });
  }
}
