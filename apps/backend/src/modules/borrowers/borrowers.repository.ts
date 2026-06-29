import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BorrowerSuggestion, BORROWER_SUGGESTIONS } from '@radio-inventar/shared';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';

/**
 * Borrower-name autocomplete. Sourced from radio-admin (the loan master) now
 * that loans no longer live locally; radio-admin owns the distinct-borrower
 * groupBy + LIKE-wildcard escaping. `lastUsed` arrives as epoch-ms and is
 * converted back to Date so the kiosk response stays byte-identical.
 */
@Injectable()
export class BorrowersRepository {
  private readonly logger = new Logger(BorrowersRepository.name);

  constructor(private readonly radioAdminService: RadioAdminService) {}

  async findSuggestions(
    query: string,
    limit: number = BORROWER_SUGGESTIONS.DEFAULT_LIMIT,
  ): Promise<BorrowerSuggestion[]> {
    this.logger.debug(`Finding borrower suggestions (limit=${limit})`);
    const capped = Math.min(limit, BORROWER_SUGGESTIONS.MAX_LIMIT);
    try {
      const suggestions = await this.radioAdminService.fetchBorrowerSuggestions(query, capped);
      return suggestions.map((s) => ({ name: s.name, lastUsed: new Date(s.lastUsed) }));
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to find suggestions:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
