import { Controller, Get, Post, Patch, Body, Logger, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, ApiQuery, ApiBody, ApiParam, getSchemaPath } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoansService } from './loans.service';
import { ListActiveLoansQueryDto } from './dto/list-active-loans.query';
import { ActiveLoanResponseDto } from './dto/active-loan-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanResponseDto } from './dto/create-loan-response.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { ReturnLoanResponseDto } from './dto/return-loan-response.dto';
import { ParseCuid2Pipe } from '../../common/pipes';
import { PAGINATION } from '@radio-inventar/shared';
import { Public } from '@/common/decorators';

@Public()
@ApiTags('loans')
@ApiExtraModels(ActiveLoanResponseDto, CreateLoanResponseDto, ReturnLoanResponseDto)
@Controller('loans')
export class LoansController {
  private readonly logger = new Logger(LoansController.name);

  constructor(private readonly loansService: LoansService) { }

  @Get('active')
  @Throttle({ default: { limit: process.env.NODE_ENV === 'test' ? 100 : 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Liste aktiver Ausleihen (nicht zurückgegeben)' })
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
    description: `Anzahl der zu überspringenden Einträge (max ${PAGINATION.MAX_SKIP})`,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste der aktiven Ausleihen mit Device-Info',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ActiveLoanResponseDto) },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Query-Parameter',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ungültige Query-Parameter' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Interner Server-Fehler',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async findActive(
    @Query() query: ListActiveLoansQueryDto,
  ): Promise<ActiveLoanResponseDto[]> {
    // L1 R3: typeof checks are for logging sanitization, NOT validation
    // class-transformer @Type(() => Number) already ensures these are numbers
    // These checks prevent logging "undefined" when optional params are omitted
    const sanitizedTake = typeof query.take === 'number' ? query.take : 'default';
    const sanitizedSkip = typeof query.skip === 'number' ? query.skip : 'default';
    this.logger.log('GET /api/loans/active', { take: sanitizedTake, skip: sanitizedSkip });
    return this.loansService.findActive(query.take, query.skip);
  }

  @Post()
  // Rate limit: 10 requests per minute in production (100 in test env)
  @Throttle({ default: { limit: process.env.NODE_ENV === 'test' ? 100 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Neue Ausleihe erstellen' })
  @ApiBody({ type: CreateLoanDto })
  @ApiResponse({
    status: 201,
    description: 'Ausleihe erfolgreich erstellt',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(CreateLoanResponseDto) },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Eingabedaten',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
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
    description: 'Gerät nicht verfügbar',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Gerät ist bereits ausgeliehen oder nicht verfügbar' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Interner Server-Fehler',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async create(@Body() dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    this.logger.log('POST /api/loans');
    return this.loansService.create(dto);
  }

  /**
   * L10 R3: NestJS Throttler counts requests BEFORE pipe validation.
   * Invalid requests (e.g., malformed loanId) are still counted against rate limit.
   */
  @Patch(':loanId')
  /**
   * Rate limit inline configuration is acceptable for this simple case:
   * - Only two environments (test vs production)
   * - Values are directly readable and maintainable
   * - No complex conditional logic required
   * - Extracting to config file would add unnecessary indirection
   */
  @Throttle({ default: { limit: process.env.NODE_ENV === 'test' ? 100 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Gerät zurückgeben' })
  @ApiParam({
    name: 'loanId',
    description: 'Ausleihe-ID (CUID2 Format)',
    example: 'cm6kqmc1200001hm1abcd123',
  })
  @ApiBody({ type: ReturnLoanDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Gerät erfolgreich zurückgegeben',
    schema: {
      type: 'object',
      properties: { data: { $ref: getSchemaPath(ReturnLoanResponseDto) } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Eingabedaten (loanId-Format oder returnNote zu lang)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ungültiges Ausleihe-ID Format' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Ausleihe nicht gefunden',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Ausleihe nicht gefunden' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Ausleihe wurde bereits zurückgegeben',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Ausleihe wurde bereits zurückgegeben' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Interner Server-Fehler',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async returnLoan(
    @Param('loanId', ParseCuid2Pipe) loanId: string,
    @Body() dto: ReturnLoanDto,
  ): Promise<ReturnLoanResponseDto> {
    // L7 R3: Request IDs are only logged for errors (via exception filter).
    // Success responses are tracked via access logs (e.g., nginx, express middleware).
    // Including request IDs in success logs would be redundant for normal operations.
    this.logger.log('PATCH /api/loans/:loanId', { loanId });
    return this.loansService.returnLoan(loanId, dto);
  }
}
