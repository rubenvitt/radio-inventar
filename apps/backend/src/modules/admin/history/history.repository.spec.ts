import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HistoryRepository } from './history.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';
import { Prisma } from '@prisma/client';

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

describe('HistoryRepository', () => {
  let repository: HistoryRepository;
  let prisma: {
    loan: { findMany: jest.Mock; count: jest.Mock; deleteMany: jest.Mock };
  };
  let radioAdmin: { fetchLoanableDevices: jest.Mock };

  beforeEach(async () => {
    prisma = {
      loan: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    radioAdmin = { fetchLoanableDevices: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: RadioAdminService, useValue: radioAdmin },
      ],
    }).compile();

    repository = module.get<HistoryRepository>(HistoryRepository);
  });

  describe('getDashboardStats', () => {
    it('prunes expired history before computing stats', async () => {
      await repository.getDashboardStats();
      expect(prisma.loan.deleteMany).toHaveBeenCalledWith({
        where: { returnedAt: { not: null, lt: expect.any(Date) } },
      });
    });

    it('derives onLoanCount from active loans and condition counts from radio-admin', async () => {
      prisma.loan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'on-loan-dev',
          borrowerName: 'A',
          borrowedAt: new Date('2025-01-02'),
          snapshotCallSign: 'RADIO-001',
          snapshotDeviceType: 'HRT',
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

    it('builds the active-loans list from snapshots (max 50, deviceType coalesced)', async () => {
      prisma.loan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'dev-1',
          borrowerName: 'John',
          borrowedAt: new Date('2025-01-01'),
          snapshotCallSign: 'RADIO-001',
          snapshotDeviceType: null,
        },
      ]);

      const result = await repository.getDashboardStats();

      expect(result.activeLoans).toEqual([
        {
          id: 'loan-1',
          device: { callSign: 'RADIO-001', deviceType: '' },
          borrowerName: 'John',
          borrowedAt: new Date('2025-01-01'),
        },
      ]);
    });

    it('degrades condition counts to 0 when radio-admin is unreachable (onLoan stays local)', async () => {
      prisma.loan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'dev-1',
          borrowerName: 'A',
          borrowedAt: new Date(),
          snapshotCallSign: 'X',
          snapshotDeviceType: 'HRT',
        },
      ]);
      radioAdmin.fetchLoanableDevices.mockRejectedValue(new Error('radio-admin down'));

      const result = await repository.getDashboardStats();

      expect(result.onLoanCount).toBe(1);
      expect(result.availableCount).toBe(0);
      expect(result.defectCount).toBe(0);
      expect(result.maintenanceCount).toBe(0);
    });

    it('maps Prisma timeout (P2024) to 408', async () => {
      prisma.loan.findMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Timeout', { code: 'P2024', clientVersion: '6' }),
      );
      try {
        await repository.getDashboardStats();
        fail('expected throw');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      }
    });

    it('sanitizes unknown errors to 500', async () => {
      prisma.loan.findMany.mockRejectedValue(new Error('boom'));
      await expect(repository.getDashboardStats()).rejects.toThrow('Database operation failed');
    });
  });

  describe('getHistory', () => {
    it('applies deviceId + from + to to where (findMany and count)', async () => {
      await repository.getHistory({ deviceId: 'dev-123', from: '2025-01-01', to: '2025-12-31', page: 1, pageSize: 100 });
      const expectedWhere = {
        deviceId: 'dev-123',
        borrowedAt: { gte: new Date('2025-01-01'), lte: new Date('2025-12-31') },
      };
      expect(prisma.loan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
      expect(prisma.loan.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('paginates with skip/take and orders by borrowedAt desc', async () => {
      await repository.getHistory({ page: 3, pageSize: 50 });
      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 50, orderBy: { borrowedAt: 'desc' } }),
      );
    });

    it('rebuilds the device sub-object from snapshots; status from returnedAt', async () => {
      prisma.loan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          deviceId: 'dev-1',
          borrowerName: 'John',
          borrowedAt: new Date('2025-01-01'),
          returnedAt: new Date('2025-01-02'),
          returnNote: 'ok',
          snapshotCallSign: 'RADIO-001',
          snapshotSerialNumber: 'SN-9',
          snapshotDeviceType: 'HRT',
        },
        {
          id: 'loan-2',
          deviceId: 'dev-2',
          borrowerName: 'Jane',
          borrowedAt: new Date('2025-01-03'),
          returnedAt: null,
          returnNote: null,
          snapshotCallSign: 'RADIO-002',
          snapshotSerialNumber: null,
          snapshotDeviceType: null,
        },
      ]);
      prisma.loan.count.mockResolvedValue(2);

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.total).toBe(2);
      expect(result.data[0].device).toEqual({
        id: 'dev-1',
        callSign: 'RADIO-001',
        serialNumber: 'SN-9',
        deviceType: 'HRT',
        status: 'AVAILABLE',
      });
      expect(result.data[1].device).toEqual({
        id: 'dev-2',
        callSign: 'RADIO-002',
        serialNumber: null,
        deviceType: '',
        status: 'ON_LOAN',
      });
    });

    it('selects snapshot fields, never a device relation', async () => {
      await repository.getHistory({ page: 1, pageSize: 100 });
      const select = prisma.loan.findMany.mock.calls[0][0].select;
      expect(select.snapshotCallSign).toBe(true);
      expect(select.snapshotSerialNumber).toBe(true);
      expect(select).not.toHaveProperty('device');
    });

    it('maps Prisma timeout (P2024) to 408', async () => {
      prisma.loan.findMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Timeout', { code: 'P2024', clientVersion: '6' }),
      );
      try {
        await repository.getHistory({ page: 1, pageSize: 100 });
        fail('expected throw');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      }
    });

    it('ignores cleanup errors and still returns data', async () => {
      prisma.loan.deleteMany.mockRejectedValue(new Error('cleanup failed'));
      const result = await repository.getHistory({ page: 1, pageSize: 100 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
