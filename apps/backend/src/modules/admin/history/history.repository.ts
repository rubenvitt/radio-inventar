import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { mapRadioAdminStatus, type HistoryFilters } from '@radio-inventar/shared';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';

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
 * Matches HistoryItemSchema from @radio-inventar/shared (before serialization).
 * The `device` object is rebuilt from the loan's immutable snapshot fields — no
 * JOIN against a local device table (devices live in radio-admin).
 */
export interface HistoryResult {
  data: Array<{
    id: string;
    device: {
      id: string;
      callSign: string;
      serialNumber: string | null;
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

const HISTORY_RETENTION_MONTHS = 2;

@Injectable()
export class HistoryRepository {
  private readonly logger = new Logger(HistoryRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly radioAdminService: RadioAdminService,
  ) {}

  private getHistoryRetentionCutoff(referenceDate: Date = new Date()): Date {
    const cutoff = new Date(referenceDate);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - HISTORY_RETENTION_MONTHS);
    return cutoff;
  }

  private async deleteExpiredHistoryEntries(): Promise<void> {
    const cutoffDate = this.getHistoryRetentionCutoff();
    try {
      const result = await this.prisma.loan.deleteMany({
        where: {
          // Keep active loans (returnedAt === null) so ongoing rentals stay visible.
          returnedAt: { not: null, lt: cutoffDate },
        },
      });
      if (result.count > 0) {
        this.logger.debug(
          `Deleted ${result.count} expired history entries older than ${HISTORY_RETENTION_MONTHS} months`,
        );
      }
    } catch (error: unknown) {
      // Cleanup must not block dashboard/history reads.
      this.logger.error(
        'Failed to delete expired history entries:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Dashboard statistics. Availability counts come from radio-admin's device
   * list (best-effort: on an outage the condition counts degrade to 0, logged),
   * while onLoanCount and the active-loans list are always derived locally.
   */
  async getDashboardStats(): Promise<DashboardStatsResult> {
    try {
      await this.deleteExpiredHistoryEntries();

      // Every active loan is a distinct device (partial unique index), so the
      // active-loan rows are the single source of truth for "on loan".
      const activeLoans = await this.prisma.loan.findMany({
        where: { returnedAt: null },
        select: {
          id: true,
          deviceId: true,
          borrowerName: true,
          borrowedAt: true,
          snapshotCallSign: true,
          snapshotDeviceType: true,
        },
        orderBy: { borrowedAt: 'desc' },
      });
      const onLoanCount = activeLoans.length;
      const activeDeviceIds = new Set(activeLoans.map((loan) => loan.deviceId));

      let availableCount = 0;
      let defectCount = 0;
      let maintenanceCount = 0;
      try {
        const devices = await this.radioAdminService.fetchLoanableDevices();
        for (const device of devices) {
          if (activeDeviceIds.has(device.id)) continue; // already counted as on loan
          const status = mapRadioAdminStatus(device.status, false);
          if (status === 'DEFECT') defectCount += 1;
          else if (status === 'MAINTENANCE') maintenanceCount += 1;
          else availableCount += 1;
        }
      } catch {
        this.logger.warn(
          'radio-admin unreachable; device condition counts unavailable (showing 0)',
        );
      }

      return {
        availableCount,
        onLoanCount,
        defectCount,
        maintenanceCount,
        activeLoans: activeLoans.slice(0, 50).map((loan) => ({
          id: loan.id,
          device: {
            callSign: loan.snapshotCallSign,
            deviceType: loan.snapshotDeviceType ?? '',
          },
          borrowerName: loan.borrowerName,
          borrowedAt: loan.borrowedAt,
        })),
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2024') {
        this.logger.error('Dashboard stats query timeout');
        throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
      }
      this.logger.error(
        'Failed to fetch dashboard stats:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Paginated loan history. The device sub-object is reconstructed from each
   * loan's snapshot — historically accurate and independent of radio-admin.
   */
  async getHistory(filters: HistoryFilters): Promise<HistoryResult> {
    const { deviceId, from, to, page = 1, pageSize = 100 } = filters;

    try {
      await this.deleteExpiredHistoryEntries();

      const where: Prisma.LoanWhereInput = {};
      if (deviceId) {
        where.deviceId = deviceId;
      }
      if (from || to) {
        where.borrowedAt = {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        };
      }

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const [rows, total] = await Promise.all([
        this.prisma.loan.findMany({
          where,
          select: {
            id: true,
            deviceId: true,
            borrowerName: true,
            borrowedAt: true,
            returnedAt: true,
            returnNote: true,
            snapshotCallSign: true,
            snapshotSerialNumber: true,
            snapshotDeviceType: true,
          },
          orderBy: { borrowedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.loan.count({ where }),
      ]);

      const data = rows.map((loan) => ({
        id: loan.id,
        device: {
          id: loan.deviceId,
          callSign: loan.snapshotCallSign,
          serialNumber: loan.snapshotSerialNumber,
          deviceType: loan.snapshotDeviceType ?? '',
          // Deterministic from the loan itself — no live device lookup.
          status: loan.returnedAt ? 'AVAILABLE' : 'ON_LOAN',
        },
        borrowerName: loan.borrowerName,
        borrowedAt: loan.borrowedAt,
        returnedAt: loan.returnedAt,
        returnNote: loan.returnNote,
      }));

      return { data, total };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2024') {
        this.logger.error('History query timeout');
        throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
      }
      this.logger.error('Failed to fetch history:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
