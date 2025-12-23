import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HistoryRepository } from './history.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('HistoryRepository', () => {
  let repository: HistoryRepository;
  let prisma: {
    device: { count: jest.Mock };
    loan: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      device: { count: jest.fn() },
      loan: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<HistoryRepository>(HistoryRepository);
  });

  describe('getDashboardStats', () => {
    it('should execute parallel COUNT queries using Promise.all', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      prisma.$transaction = mockTransaction;

      await repository.getDashboardStats();

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should aggregate AVAILABLE status correctly', async () => {
      const mockDeviceCount = jest.fn()
        .mockResolvedValueOnce(5) // AVAILABLE
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: mockDeviceCount },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.availableCount).toBe(5);
      expect(mockDeviceCount).toHaveBeenCalledWith({ where: { status: 'AVAILABLE' } });
    });

    it('should aggregate ON_LOAN status correctly', async () => {
      const mockDeviceCount = jest.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3) // ON_LOAN
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: mockDeviceCount },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.onLoanCount).toBe(3);
      expect(mockDeviceCount).toHaveBeenCalledWith({ where: { status: 'ON_LOAN' } });
    });

    it('should aggregate DEFECT status correctly', async () => {
      const mockDeviceCount = jest.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2) // DEFECT
        .mockResolvedValueOnce(0);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: mockDeviceCount },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.defectCount).toBe(2);
      expect(mockDeviceCount).toHaveBeenCalledWith({ where: { status: 'DEFECT' } });
    });

    it('should aggregate MAINTENANCE status correctly', async () => {
      const mockDeviceCount = jest.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1); // MAINTENANCE

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: mockDeviceCount },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.maintenanceCount).toBe(1);
      expect(mockDeviceCount).toHaveBeenCalledWith({ where: { status: 'MAINTENANCE' } });
    });

    it('should filter active loans by returnedAt = null', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: mockFindMany },
        };
        return callback(tx);
      });

      await repository.getDashboardStats();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { returnedAt: null },
        })
      );
    });

    it('should limit active loans to 50', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: mockFindMany },
        };
        return callback(tx);
      });

      await repository.getDashboardStats();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should sort active loans by borrowedAt DESC', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: mockFindMany },
        };
        return callback(tx);
      });

      await repository.getDashboardStats();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { borrowedAt: 'desc' },
        })
      );
    });

    it('should return 0 counts for empty database', async () => {
      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.availableCount).toBe(0);
      expect(result.onLoanCount).toBe(0);
      expect(result.defectCount).toBe(0);
      expect(result.maintenanceCount).toBe(0);
      expect(result.activeLoans).toEqual([]);
    });

    it('should return active loans with correct shape', async () => {
      const mockActiveLoans = [
        {
          id: 'loan-1',
          borrowerName: 'John Doe',
          borrowedAt: new Date('2025-01-01'),
          device: {
            callSign: 'RADIO-001',
            deviceType: 'Walkie-Talkie',
          },
        },
      ];

      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: jest.fn().mockResolvedValue(mockActiveLoans) },
        };
        return callback(tx);
      });

      const result = await repository.getDashboardStats();

      expect(result.activeLoans).toEqual(mockActiveLoans);
    });

    it('should handle Prisma connection failure', async () => {
      prisma.$transaction = jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Connection failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        })
      );

      await expect(repository.getDashboardStats()).rejects.toThrow(HttpException);
      await expect(repository.getDashboardStats()).rejects.toThrow('Database operation failed');
    });

    it('should handle Prisma timeout error (P2024)', async () => {
      prisma.$transaction = jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Timeout', {
          code: 'P2024',
          clientVersion: '5.0.0',
        })
      );

      await expect(repository.getDashboardStats()).rejects.toThrow(HttpException);
      await expect(repository.getDashboardStats()).rejects.toThrow('Request timeout');

      try {
        await repository.getDashboardStats();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      }
    });

    it('should handle transaction timeout with 10s timeout configuration', async () => {
      prisma.$transaction = jest.fn(async (callback, options) => {
        expect(options?.timeout).toBe(10000);
        const tx = {
          device: { count: jest.fn().mockResolvedValue(0) },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      await repository.getDashboardStats();

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 10000 }
      );
    });

    it('should handle generic error', async () => {
      prisma.$transaction = jest.fn().mockRejectedValue(new Error('Unknown error'));

      await expect(repository.getDashboardStats()).rejects.toThrow(HttpException);
      await expect(repository.getDashboardStats()).rejects.toThrow('Database operation failed');

      try {
        await repository.getDashboardStats();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should handle multiple concurrent calls', async () => {
      prisma.$transaction = jest.fn(async (callback) => {
        const tx = {
          device: { count: jest.fn().mockResolvedValue(1) },
          loan: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return callback(tx);
      });

      const promises = [
        repository.getDashboardStats(),
        repository.getDashboardStats(),
        repository.getDashboardStats(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('getHistory', () => {
    it('should return all loans when no filters provided', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          borrowerName: 'John Doe',
          borrowedAt: new Date('2025-01-01'),
          returnedAt: null,
          returnNote: null,
          device: {
            id: 'device-1',
            callSign: 'RADIO-001',
            deviceType: 'Walkie-Talkie',
            status: 'ON_LOAN',
          },
        },
      ];

      prisma.loan.findMany = jest.fn().mockResolvedValue(mockLoans);
      prisma.loan.count = jest.fn().mockResolvedValue(1);

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.data).toEqual(mockLoans);
      expect(result.total).toBe(1);
      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should apply deviceId filter correctly', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      await repository.getHistory({ deviceId: 'device-123', page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceId: 'device-123' },
        })
      );
    });

    it('should apply from filter correctly (gte)', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const fromDate = '2025-01-01';
      await repository.getHistory({ from: fromDate, page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            borrowedAt: {
              gte: new Date(fromDate),
            },
          },
        })
      );
    });

    it('should apply to filter correctly (lte)', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const toDate = '2025-12-31';
      await repository.getHistory({ to: toDate, page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            borrowedAt: {
              lte: new Date(toDate),
            },
          },
        })
      );
    });

    it('should combine from and to filters', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const fromDate = '2025-01-01';
      const toDate = '2025-12-31';
      await repository.getHistory({ from: fromDate, to: toDate, page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            borrowedAt: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            },
          },
        })
      );
    });

    it('should combine deviceId and from filter', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const fromDate = '2025-01-01';
      await repository.getHistory({ deviceId: 'device-123', from: fromDate, page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId: 'device-123',
            borrowedAt: {
              gte: new Date(fromDate),
            },
          },
        })
      );
    });

    it('should combine deviceId and to filter', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const toDate = '2025-12-31';
      await repository.getHistory({ deviceId: 'device-123', to: toDate, page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId: 'device-123',
            borrowedAt: {
              lte: new Date(toDate),
            },
          },
        })
      );
    });

    it('should combine deviceId, from, and to filters', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const fromDate = '2025-01-01';
      const toDate = '2025-12-31';
      await repository.getHistory({
        deviceId: 'device-123',
        from: fromDate,
        to: toDate,
        page: 1,
        pageSize: 100,
      });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId: 'device-123',
            borrowedAt: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            },
          },
        })
      );
    });

    it('should apply pagination with take and skip', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      await repository.getHistory({ page: 3, pageSize: 50 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100, // (3 - 1) * 50
          take: 50,
        })
      );
    });

    it('should calculate total count correctly', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(250);

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.total).toBe(250);
      expect(prisma.loan.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should sort by borrowedAt DESC', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      await repository.getHistory({ page: 1, pageSize: 100 });

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { borrowedAt: 'desc' },
        })
      );
    });

    it('should handle empty result set', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      await repository.getHistory({});

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (1 - 1) * 100
          take: 100,
        })
      );
    });

    it('should handle Prisma connection failure', async () => {
      prisma.loan.findMany = jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Connection failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        })
      );

      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow(HttpException);
      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow('Database operation failed');
    });

    it('should handle Prisma timeout error (P2024)', async () => {
      prisma.loan.findMany = jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Timeout', {
          code: 'P2024',
          clientVersion: '5.0.0',
        })
      );

      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow(HttpException);
      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow('Request timeout');

      try {
        await repository.getHistory({ page: 1, pageSize: 100 });
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      }
    });

    it('should handle generic error', async () => {
      prisma.loan.findMany = jest.fn().mockRejectedValue(new Error('Unknown error'));

      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow(HttpException);
      await expect(repository.getHistory({ page: 1, pageSize: 100 })).rejects.toThrow('Database operation failed');

      try {
        await repository.getHistory({ page: 1, pageSize: 100 });
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should execute parallel data and count queries using Promise.all', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      prisma.loan.findMany = mockFindMany;
      prisma.loan.count = mockCount;

      await repository.getHistory({ page: 1, pageSize: 100 });

      expect(mockFindMany).toHaveBeenCalled();
      expect(mockCount).toHaveBeenCalled();
    });

    it('should pass where clause to both findMany and count', async () => {
      prisma.loan.findMany = jest.fn().mockResolvedValue([]);
      prisma.loan.count = jest.fn().mockResolvedValue(0);

      const filters = {
        deviceId: 'device-123',
        from: '2025-01-01',
        to: '2025-12-31',
        page: 1,
        pageSize: 100,
      };

      await repository.getHistory(filters);

      const expectedWhere = {
        deviceId: 'device-123',
        borrowedAt: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31'),
        },
      };

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere })
      );
      expect(prisma.loan.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('should return data with correct shape', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          borrowerName: 'John Doe',
          borrowedAt: new Date('2025-01-01'),
          returnedAt: new Date('2025-01-02'),
          returnNote: 'All good',
          device: {
            id: 'device-1',
            callSign: 'RADIO-001',
            deviceType: 'Walkie-Talkie',
            status: 'AVAILABLE',
          },
        },
        {
          id: 'loan-2',
          borrowerName: 'Jane Smith',
          borrowedAt: new Date('2025-01-03'),
          returnedAt: null,
          returnNote: null,
          device: {
            id: 'device-2',
            callSign: 'RADIO-002',
            deviceType: 'Base Station',
            status: 'ON_LOAN',
          },
        },
      ];

      prisma.loan.findMany = jest.fn().mockResolvedValue(mockLoans);
      prisma.loan.count = jest.fn().mockResolvedValue(2);

      const result = await repository.getHistory({ page: 1, pageSize: 100 });

      expect(result.data).toEqual(mockLoans);
      expect(result.total).toBe(2);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('borrowerName');
      expect(result.data[0]).toHaveProperty('borrowedAt');
      expect(result.data[0]).toHaveProperty('returnedAt');
      expect(result.data[0]).toHaveProperty('returnNote');
      expect(result.data[0].device).toHaveProperty('id');
      expect(result.data[0].device).toHaveProperty('callSign');
      expect(result.data[0].device).toHaveProperty('deviceType');
      expect(result.data[0].device).toHaveProperty('status');
    });

    it('should handle large result sets with proper pagination', async () => {
      const mockLoans = Array.from({ length: 100 }, (_, i) => ({
        id: `loan-${i}`,
        borrowerName: `Borrower ${i}`,
        borrowedAt: new Date('2025-01-01'),
        returnedAt: null,
        returnNote: null,
        device: {
          id: `device-${i}`,
          callSign: `RADIO-${i.toString().padStart(3, '0')}`,
          deviceType: 'Walkie-Talkie',
          status: 'ON_LOAN',
        },
      }));

      prisma.loan.findMany = jest.fn().mockResolvedValue(mockLoans);
      prisma.loan.count = jest.fn().mockResolvedValue(500);

      const result = await repository.getHistory({ page: 2, pageSize: 100 });

      expect(result.data).toHaveLength(100);
      expect(result.total).toBe(500);
      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 100,
        })
      );
    });
  });
});
