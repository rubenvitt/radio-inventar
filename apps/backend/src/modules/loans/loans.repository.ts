import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ActiveLoanResponseDto } from './dto/active-loan-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanResponseDto } from './dto/create-loan-response.dto';
import { ReturnLoanResponseDto } from './dto/return-loan-response.dto';
import { PAGINATION, ERROR_MESSAGES } from '@radio-inventar/shared';
import { RadioAdminService, RadioAdminLoanError } from '@/modules/radio-admin/radio-admin.service';

/**
 * Loans Repository — a THIN CLIENT over radio-admin (the loan system of record).
 *
 * radio-inventar no longer stores loans: create/return/findActive all delegate
 * to radio-admin's S2S loan API via RadioAdminService. This layer's only job is
 * to (1) rebuild the EXACT kiosk-facing DTOs (the radio-admin LoanRecord is a
 * superset and lacks the device{} object), converting epoch-ms → Date so the
 * serialized JSON stays byte-identical, and (2) map radio-admin's {error} codes
 * back to the German HttpExceptions the kiosk has always seen.
 */

export interface FindActiveOptions {
  take?: number;
  skip?: number;
}

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = PAGINATION;

@Injectable()
export class LoansRepository {
  private readonly logger = new Logger(LoansRepository.name);

  constructor(private readonly radioAdminService: RadioAdminService) {}

  async findActive(options: FindActiveOptions = {}): Promise<ActiveLoanResponseDto[]> {
    const take = Math.min(options.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = options.skip ?? 0;

    // radio-admin returns ALL active loans (ordered borrowedAt desc, un-paginated);
    // re-apply the historical take/skip window locally.
    const all = await this.radioAdminService.fetchActiveLoans();
    return all.slice(skip, skip + take).map((loan) => ({
      id: loan.id,
      deviceId: loan.deviceId,
      borrowerName: loan.borrowerName,
      borrowedAt: new Date(loan.borrowedAt),
      device: { id: loan.deviceId, callSign: loan.snapshotCallSign, status: 'ON_LOAN' },
    }));
  }

  async create(dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    try {
      const loan = await this.radioAdminService.createLoan({
        deviceId: dto.deviceId,
        borrowerName: dto.borrowerName,
      });
      return {
        id: loan.id,
        deviceId: loan.deviceId,
        borrowerName: loan.borrowerName,
        borrowedAt: new Date(loan.borrowedAt),
        device: { id: loan.deviceId, callSign: loan.snapshotCallSign, status: 'ON_LOAN' },
      };
    } catch (error: unknown) {
      this.mapLoanError(error, 'create');
    }
  }

  async returnLoan(loanId: string, returnNote: string | null): Promise<ReturnLoanResponseDto> {
    try {
      const loan = await this.radioAdminService.returnLoan(loanId, { returnNote });
      if (loan.returnedAt === null) {
        throw new HttpException(
          'Rückgabezeitpunkt konnte nicht gesetzt werden',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return {
        id: loan.id,
        deviceId: loan.deviceId,
        borrowerName: loan.borrowerName,
        borrowedAt: new Date(loan.borrowedAt),
        returnedAt: new Date(loan.returnedAt),
        returnNote: loan.returnNote,
        device: { id: loan.deviceId, callSign: loan.snapshotCallSign, status: 'AVAILABLE' },
      };
    } catch (error: unknown) {
      this.mapLoanError(error, 'return');
    }
  }

  /**
   * Translate a radio-admin loan error into the HttpException the kiosk has
   * always received. Faithful to the pre-cutover behaviour: a non-loanable
   * device used to be absent from the loanable list (→ 404 device not found).
   */
  private mapLoanError(error: unknown, op: 'create' | 'return'): never {
    if (error instanceof RadioAdminLoanError) {
      switch (error.code) {
        case 'device_not_found':
        case 'device_not_loanable':
          throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
        case 'device_not_available':
        case 'device_already_on_loan':
          throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_AVAILABLE, HttpStatus.CONFLICT);
        case 'loan_not_found':
          throw new HttpException(ERROR_MESSAGES.LOAN_NOT_FOUND, HttpStatus.NOT_FOUND);
        case 'loan_already_returned':
          throw new HttpException(ERROR_MESSAGES.LOAN_ALREADY_RETURNED, HttpStatus.CONFLICT);
        default:
          this.logger.error(`Unexpected radio-admin ${op} error: ${error.code} (${error.status})`);
          throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    // ServiceUnavailableException (radio-admin unreachable) and the explicit
    // INTERNAL_SERVER_ERROR above are HttpExceptions — surface them unchanged.
    if (error instanceof HttpException) throw error;
    this.logger.error(`Failed to ${op} loan:`, error instanceof Error ? error.message : error);
    throw new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
