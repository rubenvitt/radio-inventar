import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
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
 * The `device` object is rebuilt from each loan's immutable snapshot — devices
 * AND loans both live in radio-admin now, so there is no local table to join.
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

/**
 * Admin dashboard + history, sourced from radio-admin (the loan master) via
 * RadioAdminService. Retention now lives in radio-admin (scheduled purge), so
 * there is no local cleanup here. Timestamps arrive as epoch-ms and are
 * converted to Date so the service's `.toISOString()` keeps emitting ISO 8601.
 */
@Injectable()
export class HistoryRepository {
  private readonly logger = new Logger(HistoryRepository.name);

  constructor(private readonly radioAdminService: RadioAdminService) {}

  /**
   * Dashboard statistics. The active-loan count + list come from radio-admin's
   * active loans; availability counts come from its loanable device list
   * (best-effort: on an outage the condition counts degrade to 0, logged).
   */
  async getDashboardStats(): Promise<DashboardStatsResult> {
    try {
      const activeLoans = await this.radioAdminService.fetchActiveLoans();
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
      } catch (error: unknown) {
        // A true outage (no cache on fetchActiveLoans) already failed above; this
        // inner block degrades the device-condition counts to 0. Distinguish a
        // reachability problem (warn) from an actual bug/schema drift (error), so
        // a non-outage failure is not silently mislabelled "unreachable".
        if (error instanceof ServiceUnavailableException) {
          this.logger.warn(
            'radio-admin unreachable; device condition counts unavailable (showing 0)',
          );
        } else {
          this.logger.error(
            'Failed to compute device condition counts (showing 0):',
            error instanceof Error ? error.message : error,
          );
        }
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
          borrowedAt: new Date(loan.borrowedAt),
        })),
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to fetch dashboard stats:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Paginated loan history from radio-admin. The device sub-object is rebuilt
   * from each loan's snapshot (status derived from returnedAt). Date filters are
   * sent as epoch-ms (radio-admin's wire format).
   */
  async getHistory(filters: HistoryFilters): Promise<HistoryResult> {
    const { deviceId, from, to, page = 1, pageSize = 100 } = filters;

    try {
      const response = await this.radioAdminService.fetchLoanHistory({
        ...(deviceId ? { deviceId } : {}),
        ...(from ? { from: new Date(from).getTime() } : {}),
        ...(to ? { to: new Date(to).getTime() } : {}),
        page,
        pageSize,
      });

      const data = response.rows.map((loan) => ({
        id: loan.id,
        device: {
          id: loan.deviceId,
          callSign: loan.snapshotCallSign,
          serialNumber: loan.snapshotSerialNumber,
          deviceType: loan.snapshotDeviceType ?? '',
          // Deterministic from the loan itself — no live device lookup.
          status: loan.returnedAt !== null ? 'AVAILABLE' : 'ON_LOAN',
        },
        borrowerName: loan.borrowerName,
        borrowedAt: new Date(loan.borrowedAt),
        // Preserve null explicitly — new Date(null) would be 1970, flipping status.
        returnedAt: loan.returnedAt === null ? null : new Date(loan.returnedAt),
        returnNote: loan.returnNote,
      }));

      return { data, total: response.total };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to fetch history:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
