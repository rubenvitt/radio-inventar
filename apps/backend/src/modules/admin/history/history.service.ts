import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HistoryRepository } from './history.repository';
import {
  DashboardStatsSchema,
  HistoryFiltersSchema,
  type DashboardStats,
  type HistoryFilters,
  type HistoryResponse,
} from '@radio-inventar/shared';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly historyRepository: HistoryRepository) {}

  /**
   * Get dashboard statistics and active loans
   *
   * @returns Validated dashboard stats with device counts and active loans
   * @throws {HttpException} On repository errors (500/408)
   *
   * - Fetches stats from repository
   * - Serializes dates to ISO 8601 strings
   * - Validates response with DashboardStatsSchema
   */
  async getDashboardStats(): Promise<DashboardStats> {
    this.logger.debug('Service: Getting dashboard stats');

    // Fetch from repository
    const result = await this.historyRepository.getDashboardStats();

    // Serialize dates to ISO 8601 strings for JSON response
    const stats = {
      ...result,
      activeLoans: result.activeLoans.map(loan => ({
        ...loan,
        borrowedAt: loan.borrowedAt.toISOString(),
      })),
    };

    // Validate response with Zod schema
    const validation = DashboardStatsSchema.safeParse(stats);
    if (!validation.success) {
      this.logger.error('Dashboard stats validation failed:', validation.error.errors);
      throw new BadRequestException('Invalid dashboard stats response');
    }

    return validation.data;
  }

  /**
   * Get paginated loan history with optional filters
   *
   * @param filters - Query filters (deviceId, from, to, page, pageSize)
   * @returns Validated history response with data and pagination metadata
   * @throws {BadRequestException} On invalid filters or date range > 365 days (400)
   * @throws {HttpException} On repository errors (500/408)
   *
   * - Validates filters with HistoryFiltersSchema (includes 365-day max range)
   * - Fetches data from repository
   * - Calculates pagination metadata (totalPages)
   * - Serializes dates to ISO 8601 strings
   */
  async getHistory(filters: Partial<HistoryFilters>): Promise<HistoryResponse> {
    this.logger.debug(`Service: Getting history with filters: ${JSON.stringify(filters)}`);

    // Validate filters with Zod schema (includes date range validation)
    const validation = HistoryFiltersSchema.safeParse(filters);
    if (!validation.success) {
      this.logger.warn('History filters validation failed:', validation.error.errors);

      // Extract first error message (German, from zod-error-map)
      const firstError = validation.error.errors[0];
      const errorMessage = firstError?.message || 'Ungültige Filter-Parameter';

      throw new BadRequestException(errorMessage);
    }

    const validatedFilters = validation.data;

    // Fetch from repository
    const { data, total } = await this.historyRepository.getHistory(validatedFilters);

    // Calculate pagination metadata
    const { page, pageSize } = validatedFilters;
    const totalPages = Math.ceil(total / pageSize);

    // Serialize dates to ISO 8601 strings for JSON response
    const serializedData = data.map(item => ({
      ...item,
      borrowedAt: item.borrowedAt.toISOString(),
      returnedAt: item.returnedAt ? item.returnedAt.toISOString() : null,
    }));

    return {
      data: serializedData,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  }
}
