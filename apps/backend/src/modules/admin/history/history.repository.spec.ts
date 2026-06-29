import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HistoryRepository } from './history.repository';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';

function raDevice(id: string, status: string | null, rufname = 'RA') {
  return {
    id,
    issi: '1',
    opta: null,
    rufname,
    status,
    location: null,
    deviceType: 'HRT',
    serialNumber: null,
    hersteller: null,
    bedieneinheit: null,
    funktion: null,
  };
}

// epoch-ms wire values (radio-admin sends integers; the repo converts to Date).
const BORROWED_MS = new Date('2025-01-01T00:00:00.000Z').getTime();
const RETURNED_MS = new Date('2025-01-02T00:00:00.000Z').getTime();

describe('HistoryRepository', () => {
  let repository: HistoryRepository;
  let radioAdmin: {
    fetchActiveLoans: jest.Mock;
    fetchLoanableDevices: jest.Mock;
    fetchLoanHistory: jest.Mock;
  };

  beforeEach(async () => {
    radioAdmin = {
      fetchActiveLoans: jest.fn().mockResolvedValue([]),
      fetchLoanableDevices: jest.fn().mockResolvedValue([]),
      fetchLoanHistory: jest
        .fn()
        .mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoryRepository, { provide: RadioAdminService, useValue: radioAdmin }],
    }).compile();

    repository = module.get<HistoryRepository>(HistoryRepository);
  });

  describe('getDashboardStats', () => {
    it('derives onLoanCount from active loans and condition counts from radio-admin', async () => {
      radioAdmin.fetchActiveLoans.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'on-loan-dev',
          snapshotCallSign: 'RADIO-001',
          snapshotDeviceType: 'HRT',
          borrowerName: 'A',
          borrowedAt: BORROWED_MS,
        },
      ]);
      radioAdmin.fetchLoanableDevices.mockResolvedValue([
        raDevice('on-loan-dev', 'Einsatzbereit'), // excluded (active loan)
        raDevice('a1', 'Einsatzbereit'),
        raDevice('a2', null),
        raDevice('d1', 'Defekt'),
        raDevice('m1', 'Wartung'),
      ]);

      const result = await repository.getDashboardStats();

      expect(result.onLoanCount).toBe(1);
      expect(result.availableCount).toBe(2);
      expect(result.defectCount).toBe(1);
      expect(result.maintenanceCount).toBe(1);
    });

    it('builds the active-loans list from snapshots (deviceType coalesced, borrowedAt ms→Date)', async () => {
      radioAdmin.fetchActiveLoans.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'dev-1',
          snapshotCallSign: 'RADIO-001',
          snapshotDeviceType: null,
          borrowerName: 'John',
          borrowedAt: BORROWED_MS,
        },
      ]);

      const result = await repository.getDashboardStats();

      expect(result.activeLoans).toEqual([
        {
          id: 'loan-1',
          device: { callSign: 'RADIO-001', deviceType: '' },
          borrowerName: 'John',
          borrowedAt: new Date(BORROWED_MS),
        },
      ]);
      expect(result.activeLoans[0].borrowedAt).toBeInstanceOf(Date);
      expect(result.activeLoans[0].borrowedAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('caps the active-loans list at 50 entries', async () => {
      radioAdmin.fetchActiveLoans.mockResolvedValue(
        Array.from({ length: 60 }, (_, i) => ({
          id: `loan-${i}`,
          deviceId: `dev-${i}`,
          snapshotCallSign: `RADIO-${i}`,
          snapshotDeviceType: 'HRT',
          borrowerName: 'A',
          borrowedAt: BORROWED_MS,
        })),
      );

      const result = await repository.getDashboardStats();

      expect(result.onLoanCount).toBe(60);
      expect(result.activeLoans).toHaveLength(50);
    });

    it('degrades condition counts to 0 when radio-admin device list is unreachable (onLoan stays)', async () => {
      radioAdmin.fetchActiveLoans.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'dev-1',
          snapshotCallSign: 'X',
          snapshotDeviceType: 'HRT',
          borrowerName: 'A',
          borrowedAt: BORROWED_MS,
        },
      ]);
      radioAdmin.fetchLoanableDevices.mockRejectedValue(new Error('radio-admin down'));

      const result = await repository.getDashboardStats();

      expect(result.onLoanCount).toBe(1);
      expect(result.availableCount).toBe(0);
      expect(result.defectCount).toBe(0);
      expect(result.maintenanceCount).toBe(0);
    });

    it('rethrows an HttpException from radio-admin untouched', async () => {
      radioAdmin.fetchActiveLoans.mockRejectedValue(
        new ServiceUnavailableException('radio-admin ist nicht erreichbar'),
      );

      await expect(repository.getDashboardStats()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('sanitizes unknown errors to 500', async () => {
      radioAdmin.fetchActiveLoans.mockRejectedValue(new Error('boom'));

      await expect(repository.getDashboardStats()).rejects.toThrow('Database operation failed');
      await expect(repository.getDashboardStats()).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe('getHistory', () => {
    it('passes deviceId + epoch-ms from/to + page/pageSize to fetchLoanHistory', async () => {
      await repository.getHistory({
        deviceId: 'dev-123',
        from: '2025-01-01',
        to: '2025-12-31',
        page: 2,
        pageSize: 25,
      });

      expect(radioAdmin.fetchLoanHistory).toHaveBeenCalledWith({
        deviceId: 'dev-123',
        from: new Date('2025-01-01').getTime(),
        to: new Date('2025-12-31').getTime(),
        page: 2,
        pageSize: 25,
      });
    });

    it('omits deviceId/from/to and passes page/pageSize through when no filters given', async () => {
      await repository.getHistory({ page: 3, pageSize: 50 });

      expect(radioAdmin.fetchLoanHistory).toHaveBeenCalledWith({ page: 3, pageSize: 50 });
    });

    it('rebuilds the device sub-object from snapshots; status from returnedAt; ms→Date; null preserved', async () => {
      radioAdmin.fetchLoanHistory.mockResolvedValue({
        rows: [
          {
            id: 'loan-1',
            deviceId: 'dev-1',
            snapshotCallSign: 'RADIO-001',
            snapshotSerialNumber: 'SN-9',
            snapshotDeviceType: 'HRT',
            borrowerName: 'John',
            borrowedAt: BORROWED_MS,
            returnedAt: RETURNED_MS,
            returnNote: 'ok',
          },
          {
            id: 'loan-2',
            deviceId: 'dev-2',
            snapshotCallSign: 'RADIO-002',
            snapshotSerialNumber: null,
            snapshotDeviceType: null,
            borrowerName: 'Jane',
            borrowedAt: BORROWED_MS,
            returnedAt: null,
            returnNote: null,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.total).toBe(2);

      // Returned loan → device rebuilt from snapshot, status AVAILABLE.
      expect(result.data[0].device).toEqual({
        id: 'dev-1',
        callSign: 'RADIO-001',
        serialNumber: 'SN-9',
        deviceType: 'HRT',
        status: 'AVAILABLE',
      });
      expect(result.data[0].borrowedAt).toBeInstanceOf(Date);
      expect(result.data[0].borrowedAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect(result.data[0].returnedAt).toBeInstanceOf(Date);
      expect((result.data[0].returnedAt as Date).toISOString()).toBe('2025-01-02T00:00:00.000Z');
      expect(result.data[0].returnNote).toBe('ok');

      // Open loan → deviceType coalesced, status ON_LOAN, returnedAt null preserved.
      expect(result.data[1].device).toEqual({
        id: 'dev-2',
        callSign: 'RADIO-002',
        serialNumber: null,
        deviceType: '',
        status: 'ON_LOAN',
      });
      expect(result.data[1].returnedAt).toBeNull();
      expect(result.data[1].returnNote).toBeNull();
    });

    it('returns total from the radio-admin response envelope', async () => {
      radioAdmin.fetchLoanHistory.mockResolvedValue({
        rows: [],
        total: 42,
        page: 1,
        pageSize: 100,
      });

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(42);
    });

    it('rethrows an HttpException from radio-admin untouched', async () => {
      radioAdmin.fetchLoanHistory.mockRejectedValue(
        new ServiceUnavailableException('radio-admin ist nicht erreichbar'),
      );

      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('sanitizes unknown errors to 500', async () => {
      radioAdmin.fetchLoanHistory.mockRejectedValue(new Error('boom'));

      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
