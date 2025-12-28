import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BorrowersService } from './borrowers.service';
import { BorrowerSuggestionsQueryDto } from './dto/borrower-suggestions.query';
import { BorrowerSuggestionResponseDto } from './dto/borrower-suggestion-response.dto';
import { BORROWER_SUGGESTIONS } from '@radio-inventar/shared';
import { Public } from '@/common/decorators';

@Public()
@ApiTags('borrowers')
@ApiExtraModels(BorrowerSuggestionResponseDto)
@Controller('borrowers')
export class BorrowersController {
  private readonly logger = new Logger(BorrowersController.name);

  constructor(private readonly borrowersService: BorrowersService) { }

  @Get('suggestions')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Namensvorschläge für Autocomplete' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: `Suchbegriff (min ${BORROWER_SUGGESTIONS.MIN_QUERY_LENGTH} Zeichen)`,
    example: 'Max',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: `Max Ergebnisse (default ${BORROWER_SUGGESTIONS.DEFAULT_LIMIT}, max ${BORROWER_SUGGESTIONS.MAX_LIMIT})`,
    example: BORROWER_SUGGESTIONS.DEFAULT_LIMIT,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste der Namensvorschläge',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(BorrowerSuggestionResponseDto) },
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
        message: { type: 'string', example: 'Validation failed' },
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
  async getSuggestions(@Query() query: BorrowerSuggestionsQueryDto) {
    this.logger.log('GET /api/borrowers/suggestions');
    return this.borrowersService.getSuggestions(query.q, query.limit);
  }
}
