import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ActiveLoanResponseDto } from './dto/active-loan-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanResponseDto } from './dto/create-loan-response.dto';
import { ReturnLoanResponseDto } from './dto/return-loan-response.dto';
import { PAGINATION, DATABASE, ERROR_MESSAGES } from '@radio-inventar/shared';

/**
 * Loans Repository - handles all loan-related database operations
 *
 * SECURITY: All database queries use Prisma ORM which provides automatic
 * SQL injection protection via parameterized queries. User input is never
 * directly interpolated into SQL strings.
 */

export interface FindActiveOptions {
  take?: number;
  skip?: number;
}

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = PAGINATION;
const { TRANSACTION_TIMEOUT_MS } = DATABASE;

@Injectable()
export class LoansRepository {
  private readonly logger = new Logger(LoansRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findActive(options: FindActiveOptions = {}): Promise<ActiveLoanResponseDto[]> {
    const take = Math.min(options.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = options.skip ?? 0;

    this.logger.debug(`Finding active loans (take=${take}, skip=${skip})`);

    try {
      return await this.prisma.loan.findMany({
        where: {
          returnedAt: null,
        },
        select: {
          id: true,
          deviceId: true,
          borrowerName: true,
          borrowedAt: true,
          device: {
            select: {
              id: true,
              callSign: true,
              status: true,
            },
          },
        },
        orderBy: {
          borrowedAt: 'desc',
        },
        take,
        skip,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to find active loans:', error instanceof Error ? error.message : error);
      // Re-throw a sanitized error, not the original Prisma error
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    this.logger.debug('Creating loan for device', { deviceId: dto.deviceId });

    // 1. First check if device exists (outside transaction for better error messages)
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
      select: { id: true, status: true },
    });

    if (!device) {
      throw new HttpException(ERROR_MESSAGES.DEVICE_NOT_FOUND, HttpStatus.NOT_FOUND); // 404
    }

    if (device.status !== 'AVAILABLE') {
      throw new HttpException(
        ERROR_MESSAGES.DEVICE_NOT_AVAILABLE,
        HttpStatus.CONFLICT, // 409
      );
    }

    // 2. Then do the atomic transaction (still needed for race condition protection)
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Update device status atomically (only if AVAILABLE)
        await tx.device.update({
          where: {
            id: dto.deviceId,
            status: 'AVAILABLE',
          },
          data: {
            status: 'ON_LOAN',
          },
        });

        // Create loan
        return tx.loan.create({
          data: {
            deviceId: dto.deviceId,
            borrowerName: dto.borrowerName,
          },
          include: {
            device: {
              select: {
                id: true,
                callSign: true,
                status: true,
              },
            },
          },
        });
      }, { timeout: TRANSACTION_TIMEOUT_MS });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025 here means race condition (someone else got it first) → 409
        if (error.code === 'P2025') {
          throw new HttpException(
            ERROR_MESSAGES.DEVICE_JUST_LOANED,
            HttpStatus.CONFLICT,
          );
        }
      }
      this.logger.error(
        'Failed to create loan:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Returns a loan and updates device status atomically.
   *
   * SECURITY NOTE (M1 R3, M6 R3): Different error messages (404 vs 409) intentionally
   * provide meaningful user feedback. ID enumeration risk is acceptable because:
   * 1. Loan IDs are non-sequential CUID2 values (24 chars, ~2^120 entropy)
   * 2. This is an internal fire department system with trusted users
   * 3. Rate limiting (10 req/min) makes brute-force enumeration impractical
   *
   * TIMING NOTE: Response time may vary based on error type (404 is faster than
   * 409 due to early database check). This is acceptable for an internal system
   * where the user experience benefit outweighs the minimal timing attack risk.
   */
  async returnLoan(loanId: string, returnNote: string | null): Promise<ReturnLoanResponseDto> {
    this.logger.debug('Returning loan', { loanId });

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Step 1: Check loan existence and returnedAt status inside transaction
          // This reduces race window by performing validation atomically with updates
          const existingLoan = await tx.loan.findUnique({
            where: { id: loanId },
            select: { id: true, returnedAt: true, deviceId: true },
          });

          if (!existingLoan) {
            throw new HttpException(ERROR_MESSAGES.LOAN_NOT_FOUND, HttpStatus.NOT_FOUND);
          }

          if (existingLoan.returnedAt !== null) {
            throw new HttpException(
              ERROR_MESSAGES.LOAN_ALREADY_RETURNED,
              HttpStatus.CONFLICT,
            );
          }

          // Step 2: Update device status with WHERE clause for race condition safety
          const deviceUpdateResult = await tx.device.updateMany({
            where: {
              id: existingLoan.deviceId,
              status: 'ON_LOAN',
            },
            data: {
              status: 'AVAILABLE',
            },
          });

          // Verify device status was actually updated (race condition detection)
          // L8 R3: Repeated 409 conflicts may indicate issues (e.g., UI bugs, concurrent users).
          // Monitor this warning via logging aggregation (e.g., CloudWatch, Datadog) for patterns.
          if (deviceUpdateResult.count === 0) {
            this.logger.warn('Race condition detected during loan return', { loanId });
            throw new HttpException(
              ERROR_MESSAGES.DEVICE_STATUS_CHANGED,
              HttpStatus.CONFLICT,
            );
          }

          // Step 3: Update loan with return info
          try {
            const updated = await tx.loan.update({
              where: { id: loanId },
              data: {
                returnedAt: new Date(),
                returnNote: returnNote,
              },
              include: {
                device: {
                  select: {
                    id: true,
                    callSign: true,
                    status: true,
                  },
                },
              },
            });

            /**
             * Runtime validation before type assertion
             * H1 Fix: Ensure returnedAt is actually set before returning
             * This guards against unexpected database state where returnedAt could still be null
             */
            if (!updated.returnedAt) {
              throw new HttpException(
                'Rückgabezeitpunkt konnte nicht gesetzt werden',
                HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }

            return updated as typeof updated & { returnedAt: Date };
          } catch (error: unknown) {
            // Differentiate loan update failure from device update failure
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
              throw new HttpException(
                ERROR_MESSAGES.LOAN_JUST_RETURNED,
                HttpStatus.CONFLICT,
              );
            }
            throw error;
          }
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      );
    } catch (error: unknown) {
      // Re-throw HttpExceptions from inside transaction
      if (error instanceof HttpException) {
        throw error;
      }

      /**
       * H2 Fix: Explicit handling for Prisma timeout and transaction conflict errors
       * P2024: Timeout - database took too long to respond
       * P2034: Transaction conflict - concurrent transaction modified the same data
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2024') {
          this.logger.error('Database timeout during loan return:', error.message);
          throw new HttpException(
            'Datenbankoperation hat zu lange gedauert. Bitte versuchen Sie es erneut.',
            HttpStatus.REQUEST_TIMEOUT,
          );
        }
        if (error.code === 'P2034') {
          this.logger.error('Transaction conflict during loan return:', error.message);
          throw new HttpException(
            'Konflikt bei gleichzeitiger Bearbeitung. Bitte versuchen Sie es erneut.',
            HttpStatus.CONFLICT,
          );
        }
      }

      // P2025 errors are now handled specifically in the transaction
      // If we reach here, it's an unexpected error
      this.logger.error(
        'Failed to return loan:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
