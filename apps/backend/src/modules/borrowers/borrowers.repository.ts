import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { BorrowerSuggestion, BORROWER_SUGGESTIONS } from '@radio-inventar/shared';

@Injectable()
export class BorrowersRepository {
  private readonly logger = new Logger(BorrowersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private escapeLikeWildcards(value: string): string {
    return value.replace(/[%_]/g, '\\$&');
  }

  async findSuggestions(query: string, limit: number = BORROWER_SUGGESTIONS.DEFAULT_LIMIT): Promise<BorrowerSuggestion[]> {
    this.logger.debug(`Finding borrower suggestions (limit=${limit})`);
    try {
      const escapedQuery = this.escapeLikeWildcards(query);
      const suggestions = await this.prisma.loan.groupBy({
        by: ['borrowerName'],
        where: { borrowerName: { contains: escapedQuery, mode: 'insensitive' } },
        _max: { borrowedAt: true },
        orderBy: { _max: { borrowedAt: 'desc' } },
        take: Math.min(limit, BORROWER_SUGGESTIONS.MAX_LIMIT),
      });
      return suggestions.map(s => {
        const lastUsed = s._max.borrowedAt;
        if (!lastUsed) {
          throw new HttpException('Invalid data: borrowedAt is null', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { name: s.borrowerName, lastUsed };
      });
    } catch (error: unknown) {
      this.logger.error('Failed to find suggestions:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
