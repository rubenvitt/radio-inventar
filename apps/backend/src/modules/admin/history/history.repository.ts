import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { HistoryFilters } from '@radio-inventar/shared';

/**
 * Dashboard Statistics Return Type
 * Matches DashboardStatsSchema from @radio-inventar/shared
 */
export interface DashboardStatsResult {
  availableCount: number;
  onLoanCount: number;
  defectCount: number;
  maintenanceCount: number;
  activeLoans: Array<{
    id: string;
    device: {
      callSign: string;
      deviceType: string;
    };
    borrowerName: string;
    borrowedAt: Date;
  }>;
}

/**
 * History Query Result Type
 * Matches HistoryItemSchema from @radio-inventar/shared (before serialization)
 */
export interface HistoryResult {
  data: Array<{
    id: string;
    device: {
      id: string;
      callSign: string;
      serialNumber: string | null; // Story 6.4: Required for CSV export (AC3)
      deviceType: string;
      status: string;
    };
    borrowerName: string;
    borrowedAt: Date;
    returnedAt: Date | null;
    returnNote: string | null;
  }>;
  total: number;
}

@Injectable()
export class HistoryRepository {
  private readonly logger = new Logger(HistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard statistics and active loans
   *
   * @returns Dashboard stats with device counts and up to 50 active loans
   * @throws {HttpException} On database errors (500) or timeout (408)
   *
   * Performance: Uses parallel COUNT queries and transaction with 10s timeout
   * Indexes used: Device.status, Loan.returnedAt, Loan.borrowedAt
   */
  async getDashboardStats(): Promise<DashboardStatsResult> {
    this.logger.debug('Fetching dashboard statistics');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Parallel COUNT queries for all device statuses (4x faster than sequential)
        const [availableCount, onLoanCount, defectCount, maintenanceCount] =
          await Promise.all([
            tx.device.count({ where: { status: 'AVAILABLE' } }),
            tx.device.count({ where: { status: 'ON_LOAN' } }),
            tx.device.count({ where: { status: 'DEFECT' } }),
            tx.device.count({ where: { status: 'MAINTENANCE' } }),
          ]);

        // Active loans (returnedAt = null) limited to 50, ordered by most recent
        // Uses returnedAt and borrowedAt indexes for performance
        const activeLoans = await tx.loan.findMany({
          where: { returnedAt: null },
          select: {
            id: true,
            borrowerName: true,
            borrowedAt: true,
            device: {
              select: {
                callSign: true,
                deviceType: true,
              }
            }
          },
          orderBy: { borrowedAt: 'desc' },
          take: 50, // Enforce 50 limit (AC2)
        });

        this.logger.debug(`Dashboard stats: ${availableCount} available, ${onLoanCount} on loan, ${defectCount} defect, ${maintenanceCount} maintenance, ${activeLoans.length} active loans`);

        return {
          availableCount,
          onLoanCount,
          defectCount,
          maintenanceCount,
          activeLoans,
        };
      }, { timeout: 10000 }); // 10s timeout
    } catch (error: unknown) {
      // Handle Prisma timeout
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2024') {
          this.logger.error('Dashboard stats query timeout');
          throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
        }
      }

      // Log and throw generic error
      this.logger.error('Failed to fetch dashboard stats:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get paginated loan history with optional filters
   *
   * @param filters - Query filters (deviceId, from, to, page, pageSize)
   * @returns Paginated history data and total count
   * @throws {HttpException} On database errors (500) or timeout (408)
   *
   * Performance: Uses borrowedAt index for sorting and date filters
   * Pagination: Default 100 items, max 1000 items per page
   */
  async getHistory(filters: HistoryFilters): Promise<HistoryResult> {
    const { deviceId, from, to, page = 1, pageSize = 100 } = filters;

    this.logger.debug(`Fetching history: page=${page}, pageSize=${pageSize}, deviceId=${deviceId || 'all'}, from=${from || 'none'}, to=${to || 'none'}`);

    try {
      // Build dynamic WHERE clause
      const where: Prisma.LoanWhereInput = {};

      // Filter by deviceId (AC4)
      if (deviceId) {
        where.deviceId = deviceId;
      }

      // Filter by date range (AC5)
      // Uses spread operator pattern for conditional filters
      if (from || to) {
        where.borrowedAt = {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        };
      }

      // Pagination calculation
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Parallel data + count queries (faster than sequential)
      const [data, total] = await Promise.all([
        this.prisma.loan.findMany({
          where,
          select: {
            id: true,
            borrowerName: true,
            borrowedAt: true,
            returnedAt: true,
            returnNote: true,
            device: {
              select: {
                id: true,
                callSign: true,
                serialNumber: true, // Story 6.4: Required for CSV export (AC3)
                deviceType: true,
                status: true,
              }
            }
          },
          orderBy: { borrowedAt: 'desc' }, // Most recent first (AC3)
          skip,
          take,
        }),
        this.prisma.loan.count({ where }),
      ]);

      this.logger.debug(`History query returned ${data.length} items (total: ${total})`);

      return { data, total };
    } catch (error: unknown) {
      // Handle Prisma timeout
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2024') {
          this.logger.error('History query timeout');
          throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
        }
      }

      // Log and throw generic error
      this.logger.error('Failed to fetch history:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
