import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { LoansRepository } from './loans.repository';
import {
  RadioAdminService,
  RadioAdminLoanError,
} from '@/modules/radio-admin/radio-admin.service';

/**
 * LoansRepository is now a THIN CLIENT over radio-admin (the loan system of
 * record). It no longer touches prisma.loan: create/return/findActive delegate
 * to RadioAdminService. These tests mock RadioAdminService and assert that the
 * repository (1) rebuilds the kiosk-facing DTOs — converting epoch-ms → Date and
 * reattaching the device{} object — and (2) maps RadioAdminLoanError codes to the
 * historical German HttpExceptions.
 */
describe('LoansRepository', () => {
  let repository: LoansRepository;
  let radioAdmin: {
    fetchActiveLoans: jest.Mock;
    createLoan: jest.Mock;
    returnLoan: jest.Mock;
  };

  /** Capture the rejection of a promise, failing if it unexpectedly resolves. */
  async function captureError(promise: Promise<unknown>): Promise<unknown> {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error('expected promise to reject, but it resolved');
  }

  beforeEach(async () => {
    radioAdmin = {
      fetchActiveLoans: jest.fn(),
      createLoan: jest.fn(),
      returnLoan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoansRepository, { provide: RadioAdminService, useValue: radioAdmin }],
    }).compile();

    repository = module.get<LoansRepository>(LoansRepository);
  });

  describe('findActive', () => {
    const borrowedAtMs = Date.parse('2025-12-16T08:00:00Z');

    const activeLoan = {
      id: 'loan1abcdefghijklmnopqrs',
      deviceId: 'device1abcdefghijklmnopq',
      snapshotCallSign: 'Florian 4-22',
      snapshotDeviceType: 'HRT',
      borrowerName: 'Tim Schäfer',
      borrowedAt: borrowedAtMs,
    };

    function makeLoan(i: number) {
      return {
        id: `loan-${i}`,
        deviceId: `device-${i}`,
        snapshotCallSign: `Florian ${i}`,
        snapshotDeviceType: 'HRT',
        borrowerName: `Borrower ${i}`,
        borrowedAt: borrowedAtMs - i * 1000,
      };
    }

    it('maps a radio-admin active loan to the kiosk DTO (borrowedAt Date, device ON_LOAN)', async () => {
      radioAdmin.fetchActiveLoans.mockResolvedValue([activeLoan]);

      const result = await repository.findActive();

      expect(radioAdmin.fetchActiveLoans).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: activeLoan.id,
          deviceId: activeLoan.deviceId,
          borrowerName: activeLoan.borrowerName,
          borrowedAt: new Date(borrowedAtMs),
          device: {
            id: activeLoan.deviceId,
            callSign: activeLoan.snapshotCallSign,
            status: 'ON_LOAN',
          },
        },
      ]);
      expect(result[0].borrowedAt).toBeInstanceOf(Date);
      expect(result[0].borrowedAt.toISOString()).toBe('2025-12-16T08:00:00.000Z');
    });

    it('applies the skip/take window locally by slicing the un-paginated list', async () => {
      const loans = [makeLoan(0), makeLoan(1), makeLoan(2), makeLoan(3), makeLoan(4)];
      radioAdmin.fetchActiveLoans.mockResolvedValue(loans);

      const result = await repository.findActive({ take: 2, skip: 1 });

      expect(result.map((r) => r.id)).toEqual(['loan-1', 'loan-2']);
    });

    it('defaults take to DEFAULT_PAGE_SIZE (100) when not provided', async () => {
      const loans = Array.from({ length: 150 }, (_, i) => makeLoan(i));
      radioAdmin.fetchActiveLoans.mockResolvedValue(loans);

      const result = await repository.findActive();

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe('loan-0');
    });

    it('caps take at MAX_PAGE_SIZE (500)', async () => {
      const loans = Array.from({ length: 600 }, (_, i) => makeLoan(i));
      radioAdmin.fetchActiveLoans.mockResolvedValue(loans);

      const result = await repository.findActive({ take: 1000 });

      expect(result).toHaveLength(500);
    });

    it('propagates errors from radio-admin unchanged', async () => {
      radioAdmin.fetchActiveLoans.mockRejectedValue(new Error('radio-admin unreachable'));
      await expect(repository.findActive()).rejects.toThrow('radio-admin unreachable');
    });
  });

  describe('create', () => {
    const createDto = { deviceId: 'clz123456789012345678901', borrowerName: 'Max Mustermann' };
    const borrowedAtMs = Date.parse('2025-12-16T10:00:00Z');

    const loanRecord = {
      id: 'loan12345678901234567890',
      deviceId: createDto.deviceId,
      snapshotCallSign: 'Florian 4/1',
      snapshotSerialNumber: 'SN-1',
      snapshotDeviceType: 'HRT',
      borrowerName: createDto.borrowerName,
      borrowedAt: borrowedAtMs,
      returnedAt: null,
      returnNote: null,
    };

    it('delegates to radio-admin and returns the kiosk DTO (borrowedAt Date, device ON_LOAN)', async () => {
      radioAdmin.createLoan.mockResolvedValue(loanRecord);

      const result = await repository.create(createDto);

      expect(radioAdmin.createLoan).toHaveBeenCalledWith({
        deviceId: createDto.deviceId,
        borrowerName: createDto.borrowerName,
      });
      expect(result).toEqual({
        id: loanRecord.id,
        deviceId: createDto.deviceId,
        borrowerName: createDto.borrowerName,
        borrowedAt: new Date(borrowedAtMs),
        device: { id: createDto.deviceId, callSign: 'Florian 4/1', status: 'ON_LOAN' },
      });
      expect(result.borrowedAt).toBeInstanceOf(Date);
    });

    it.each([
      ['device_not_found', 404],
      ['device_not_loanable', 404],
      ['device_not_available', 409],
      ['device_already_on_loan', 409],
    ])('maps RadioAdminLoanError %s to HttpException %i', async (code, httpStatus) => {
      radioAdmin.createLoan.mockRejectedValue(new RadioAdminLoanError(code as string, 400));

      const error = await captureError(repository.create(createDto));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(httpStatus);
    });

    it('sanitizes unknown radio-admin errors to 500', async () => {
      radioAdmin.createLoan.mockRejectedValue(new RadioAdminLoanError('something_weird', 400));

      const error = await captureError(repository.create(createDto));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(500);
    });

    it('sanitizes non-loan errors to 500', async () => {
      radioAdmin.createLoan.mockRejectedValue(new Error('boom'));

      const error = await captureError(repository.create(createDto));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(500);
    });
  });

  describe('returnLoan', () => {
    const loanId = 'loan12345678901234567890';
    const deviceId = 'device123456789012345678';
    const borrowedAtMs = Date.parse('2025-12-16T08:00:00Z');
    const returnedAtMs = Date.parse('2025-12-18T14:00:00Z');

    function returnedRecord(returnNote: string | null) {
      return {
        id: loanId,
        deviceId,
        snapshotCallSign: 'Florian 4-22',
        snapshotSerialNumber: 'SN-1',
        snapshotDeviceType: 'HRT',
        borrowerName: 'Max Mustermann',
        borrowedAt: borrowedAtMs,
        returnedAt: returnedAtMs,
        returnNote,
      };
    }

    it('delegates to radio-admin and returns the kiosk DTO (dates + device AVAILABLE)', async () => {
      radioAdmin.returnLoan.mockResolvedValue(returnedRecord(null));

      const result = await repository.returnLoan(loanId, null);

      expect(radioAdmin.returnLoan).toHaveBeenCalledWith(loanId, { returnNote: null });
      expect(result).toEqual({
        id: loanId,
        deviceId,
        borrowerName: 'Max Mustermann',
        borrowedAt: new Date(borrowedAtMs),
        returnedAt: new Date(returnedAtMs),
        returnNote: null,
        device: { id: deviceId, callSign: 'Florian 4-22', status: 'AVAILABLE' },
      });
      expect(result.borrowedAt).toBeInstanceOf(Date);
      expect(result.returnedAt).toBeInstanceOf(Date);
      expect(result.returnedAt.toISOString()).toBe('2025-12-18T14:00:00.000Z');
    });

    it('passes through and preserves the return note', async () => {
      radioAdmin.returnLoan.mockResolvedValue(returnedRecord('Akku schwach'));

      const result = await repository.returnLoan(loanId, 'Akku schwach');

      expect(radioAdmin.returnLoan).toHaveBeenCalledWith(loanId, { returnNote: 'Akku schwach' });
      expect(result.returnNote).toBe('Akku schwach');
    });

    it('throws 500 when radio-admin returns a record without a returnedAt', async () => {
      radioAdmin.returnLoan.mockResolvedValue({ ...returnedRecord(null), returnedAt: null });

      const error = await captureError(repository.returnLoan(loanId, null));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(500);
    });

    it.each([
      ['loan_not_found', 404],
      ['loan_already_returned', 409],
    ])('maps RadioAdminLoanError %s to HttpException %i', async (code, httpStatus) => {
      radioAdmin.returnLoan.mockRejectedValue(new RadioAdminLoanError(code as string, 400));

      const error = await captureError(repository.returnLoan(loanId, null));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(httpStatus);
    });

    it('sanitizes unknown radio-admin errors to 500', async () => {
      radioAdmin.returnLoan.mockRejectedValue(new Error('boom'));

      const error = await captureError(repository.returnLoan(loanId, null));

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(500);
    });
  });
});
