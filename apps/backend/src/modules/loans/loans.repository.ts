import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ActiveLoanResponseDto } from './dto/active-loan-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanResponseDto } from './dto/create-loan-response.dto';
import { ReturnLoanResponseDto } from './dto/return-loan-response.dto';
import { PAGINATION, ERROR_MESSAGES, mapRadioAdminStatus } from '@radio-inventar/shared';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';

/**
 * Loans Repository — owns the loan lifecycle locally.
 *
 * Devices are NOT stored locally anymore: master data comes read-only from
 * radio-admin via RadioAdminService, and each loan keeps an immutable SNAPSHOT
 * of the device's display fields. Availability is derived from active loans, so
 * there is no device status to write back. The atomic "one active loan per
 * device" guarantee is enforced by the partial unique index
 * `loans_device_active_uidx` (a concurrent insert hits P2002 → 409) instead of
 * the old read-status-then-CAS dance.
 */

export interface FindActiveOptions {
  take?: number;
  skip?: number;
}

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = PAGINATION;

@Injectable()
export class LoansRepository {
  private readonly logger = new Logger(LoansRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly radioAdminService: RadioAdminService,
  ) {}

  async findActive(options: FindActiveOptions = {}): Promise<ActiveLoanResponseDto[]> {
    const take = Math.min(options.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = options.skip ?? 0;

    try {
      const loans = await this.prisma.loan.findMany({
        where: { returnedAt: null },
        select: {
          id: true,
          deviceId: true,
          borrowerName: true,
          borrowedAt: true,
          snapshotCallSign: true,
        },
        orderBy: { borrowedAt: 'desc' },
        take,
        skip,
      });

      return loans.map((loan) => ({
        id: loan.id,
        deviceId: loan.deviceId,
        borrowerName: loan.borrowerName,
        borrowedAt: loan.borrowedAt,
        // An active loan is by definition ON_LOAN; rebuilt from the snapshot.
        device: { id: loan.deviceId, callSign: loan.snapshotCallSign, status: 'ON_LOAN' },
      }));
    } catch (error: unknown) {
      this.logger.error('Failed to find active loans:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async create(dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    // Device master data is owned by radio-admin (read-only). Not loanable there
    // → not borrowable here.
    const device = await this.radioAdminService.getDeviceById(dto.deviceId);
    if (!device) {
      throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // radio-admin is the master for device condition: block defect / maintenance.
    const condition = mapRadioAdminStatus(device.status, false);
    if (condition === 'DEFECT' || condition === 'MAINTENANCE') {
      throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_AVAILABLE, HttpStatus.CONFLICT);
    }

    const callSign = device.rufname ?? device.issi;

    try {
      const loan = await this.prisma.loan.create({
        data: {
          deviceId: dto.deviceId,
          borrowerName: dto.borrowerName,
          snapshotCallSign: callSign,
          snapshotSerialNumber: device.serialNumber,
          snapshotDeviceType: device.deviceType,
        },
        select: { id: true, deviceId: true, borrowerName: true, borrowedAt: true },
      });

      return {
        id: loan.id,
        deviceId: loan.deviceId,
        borrowerName: loan.borrowerName,
        borrowedAt: loan.borrowedAt,
        device: { id: loan.deviceId, callSign, status: 'ON_LOAN' },
      };
    } catch (error: unknown) {
      // Partial unique index violation → device already has an active loan.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_AVAILABLE, HttpStatus.CONFLICT);
      }
      this.logger.error('Failed to create loan:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async returnLoan(loanId: string, returnNote: string | null): Promise<ReturnLoanResponseDto> {
    try {
      // Atomic close: only the still-open row is updated. count===0 means the
      // loan is missing or already returned — no transaction needed.
      const result = await this.prisma.loan.updateMany({
        where: { id: loanId, returnedAt: null },
        data: { returnedAt: new Date(), returnNote },
      });

      if (result.count === 0) {
        const exists = await this.prisma.loan.findUnique({
          where: { id: loanId },
          select: { id: true },
        });
        throw new HttpException(
          exists ? ERROR_MESSAGES.LOAN_ALREADY_RETURNED : ERROR_MESSAGES.LOAN_NOT_FOUND,
          exists ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND,
        );
      }

      const updated = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          deviceId: true,
          borrowerName: true,
          borrowedAt: true,
          returnedAt: true,
          returnNote: true,
          snapshotCallSign: true,
        },
      });
      if (!updated || !updated.returnedAt) {
        throw new HttpException(
          'Rückgabezeitpunkt konnte nicht gesetzt werden',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        id: updated.id,
        deviceId: updated.deviceId,
        borrowerName: updated.borrowerName,
        borrowedAt: updated.borrowedAt,
        returnedAt: updated.returnedAt,
        returnNote: updated.returnNote,
        device: { id: updated.deviceId, callSign: updated.snapshotCallSign, status: 'AVAILABLE' },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to return loan:', error instanceof Error ? error.message : error);
      throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
