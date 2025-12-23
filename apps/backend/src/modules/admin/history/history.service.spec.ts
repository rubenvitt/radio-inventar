import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryRepository } from './history.repository';
import type { DashboardStatsResult, HistoryResult } from './history.repository';

describe('HistoryService', () => {
  let service: HistoryService;
  let repository: jest.Mocked<HistoryRepository>;

  const mockDashboardStats: DashboardStatsResult = {
    availableCount: 10,
    onLoanCount: 5,
    defectCount: 2,
    maintenanceCount: 1,
    activeLoans: [
      {
        id: 'clabcd1234567890abcdef',
        device: {
          callSign: 'Florian 4-22',
          deviceType: 'HRT',
        },
        borrowerName: 'Tim Schäfer',
        borrowedAt: new Date('2025-12-20T10:00:00.000Z'),
      },
    ],
  };

  const mockHistoryResult: HistoryResult = {
    data: [
      {
        id: 'clabcd1234567890abcdef',
        device: {
          id: 'cldevice1234567890abcd',
          callSign: 'Florian 4-22',
          deviceType: 'HRT',
          status: 'AVAILABLE',
        },
        borrowerName: 'Tim Schäfer',
        borrowedAt: new Date('2025-12-20T10:00:00.000Z'),
        returnedAt: new Date('2025-12-20T18:00:00.000Z'),
        returnNote: 'Alles OK',
      },
    ],
    total: 1,
  };

  beforeEach(async () => {
    const mockRepository = {
      getDashboardStats: jest.fn(),
      getHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: HistoryRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
    repository = module.get(HistoryRepository);
  });

  describe('getDashboardStats', () => {
    it('should delegate to repository', async () => {
      repository.getDashboardStats.mockResolvedValue(mockDashboardStats);

      await service.getDashboardStats();

      expect(repository.getDashboardStats).toHaveBeenCalled();
      expect(repository.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    it('should validate response with DashboardStatsSchema', async () => {
      repository.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('availableCount');
      expect(result).toHaveProperty('onLoanCount');
      expect(result).toHaveProperty('defectCount');
      expect(result).toHaveProperty('maintenanceCount');
      expect(result).toHaveProperty('activeLoans');
      expect(Array.isArray(result.activeLoans)).toBe(true);
    });

    it('should serialize dates to ISO 8601 strings', async () => {
      repository.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const result = await service.getDashboardStats();

      expect(result.activeLoans[0].borrowedAt).toBe('2025-12-20T10:00:00.000Z');
      expect(typeof result.activeLoans[0].borrowedAt).toBe('string');
    });

    it('should handle repository errors with 500 status', async () => {
      const error = new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
      repository.getDashboardStats.mockRejectedValue(error);

      await expect(service.getDashboardStats()).rejects.toThrow(HttpException);
      await expect(service.getDashboardStats()).rejects.toMatchObject({
        message: 'Database operation failed',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should handle repository timeout errors with 408 status', async () => {
      const error = new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
      repository.getDashboardStats.mockRejectedValue(error);

      await expect(service.getDashboardStats()).rejects.toThrow(HttpException);
      await expect(service.getDashboardStats()).rejects.toMatchObject({
        message: 'Request timeout',
        status: HttpStatus.REQUEST_TIMEOUT,
      });
    });

    it('should handle empty activeLoans array', async () => {
      const statsWithNoLoans: DashboardStatsResult = {
        ...mockDashboardStats,
        activeLoans: [],
      };
      repository.getDashboardStats.mockResolvedValue(statsWithNoLoans);

      const result = await service.getDashboardStats();

      expect(result.activeLoans).toEqual([]);
      expect(result.activeLoans.length).toBe(0);
    });

    it('should handle max activeLoans (50 items)', async () => {
      const activeLoans = Array.from({ length: 50 }, (_, i) => ({
        id: `clloan${String(i).padStart(18, '0')}`,
        device: {
          callSign: `Device ${i}`,
          deviceType: 'HRT',
        },
        borrowerName: `Borrower ${i}`,
        borrowedAt: new Date('2025-12-20T10:00:00.000Z'),
      }));

      const statsWithMaxLoans: DashboardStatsResult = {
        ...mockDashboardStats,
        activeLoans,
      };
      repository.getDashboardStats.mockResolvedValue(statsWithMaxLoans);

      const result = await service.getDashboardStats();

      expect(result.activeLoans.length).toBe(50);
      expect(result.activeLoans[0].borrowedAt).toBe('2025-12-20T10:00:00.000Z');
    });

    it('should reject schema validation with invalid data', async () => {
      const invalidStats = {
        ...mockDashboardStats,
        availableCount: -1, // Invalid: negative count
      };
      repository.getDashboardStats.mockResolvedValue(invalidStats as any);

      await expect(service.getDashboardStats()).rejects.toThrow(BadRequestException);
      await expect(service.getDashboardStats()).rejects.toMatchObject({
        message: 'Invalid dashboard stats response',
      });
    });

    it('should handle multiple concurrent calls', async () => {
      repository.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const results = await Promise.all([
        service.getDashboardStats(),
        service.getDashboardStats(),
        service.getDashboardStats(),
      ]);

      expect(results).toHaveLength(3);
      expect(repository.getDashboardStats).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.activeLoans[0].borrowedAt).toBe('2025-12-20T10:00:00.000Z');
      });
    });

    it('should enforce 50 item limit when repository returns more than 50 items', async () => {
      const activeLoans = Array.from({ length: 100 }, (_, i) => ({
        id: `clloan${String(i).padStart(18, '0')}`,
        device: {
          callSign: `Device ${i}`,
          deviceType: 'HRT',
        },
        borrowerName: `Borrower ${i}`,
        borrowedAt: new Date('2025-12-20T10:00:00.000Z'),
      }));

      const statsWithTooManyLoans: DashboardStatsResult = {
        ...mockDashboardStats,
        activeLoans,
      };
      repository.getDashboardStats.mockResolvedValue(statsWithTooManyLoans);

      await expect(service.getDashboardStats()).rejects.toThrow(BadRequestException);
      await expect(service.getDashboardStats()).rejects.toMatchObject({
        message: 'Invalid dashboard stats response',
      });
    });

    it('should handle null/undefined from repository gracefully', async () => {
      repository.getDashboardStats.mockResolvedValue(null as any);

      await expect(service.getDashboardStats()).rejects.toThrow();
    });
  });

  describe('getHistory', () => {
    it('should validate filters with HistoryFiltersSchema', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        page: 1,
        pageSize: 100,
      });

      expect(repository.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
      });
    });

    it('should reject invalid deviceId (non-CUID format)', async () => {
      await expect(service.getHistory({
        deviceId: 'invalid-id',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid date format (non-ISO)', async () => {
      await expect(service.getHistory({
        from: '2025-12-20', // Missing time component
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject date range > 365 days', async () => {
      await expect(service.getHistory({
        from: '2024-01-01T00:00:00.000Z',
        to: '2025-12-31T23:59:59.999Z', // More than 365 days
      })).rejects.toThrow(BadRequestException);

      try {
        await service.getHistory({
          from: '2024-01-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toContain('365');
      }
    });

    it('should reject from > to', async () => {
      await expect(service.getHistory({
        from: '2025-12-20T00:00:00.000Z',
        to: '2025-12-19T00:00:00.000Z', // to is before from
      })).rejects.toThrow(BadRequestException);

      try {
        await service.getHistory({
          from: '2025-12-20T00:00:00.000Z',
          to: '2025-12-19T00:00:00.000Z',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toContain('365');
      }
    });

    it('should apply default pagination (page=1, pageSize=100)', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({});

      expect(repository.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
      });
    });

    it('should enforce max pageSize (1000)', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await expect(service.getHistory({
        pageSize: 1001, // Exceeds max
      })).rejects.toThrow(BadRequestException);
    });

    it('should calculate totalPages correctly - scenario 1: 50 total, 25 pageSize', async () => {
      repository.getHistory.mockResolvedValue({ ...mockHistoryResult, total: 50 });

      const result = await service.getHistory({ pageSize: 25 });

      expect(result.meta.totalPages).toBe(2); // Math.ceil(50 / 25)
    });

    it('should calculate totalPages correctly - scenario 2: 99 total, 10 pageSize', async () => {
      repository.getHistory.mockResolvedValue({ ...mockHistoryResult, total: 99 });

      const result = await service.getHistory({ pageSize: 10 });

      expect(result.meta.totalPages).toBe(10); // Math.ceil(99 / 10)
    });

    it('should calculate totalPages correctly - scenario 3: 1 total, 100 pageSize', async () => {
      repository.getHistory.mockResolvedValue({ ...mockHistoryResult, total: 1 });

      const result = await service.getHistory({ pageSize: 100 });

      expect(result.meta.totalPages).toBe(1); // Math.ceil(1 / 100)
    });

    it('should filter by deviceId only', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        deviceId: 'cldevice1234567890abcd',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'cldevice1234567890abcd',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by from date only', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        from: '2025-12-01T00:00:00.000Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2025-12-01T00:00:00.000Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by to date only', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        to: '2025-12-31T23:59:59.999Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '2025-12-31T23:59:59.999Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by deviceId and from', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        deviceId: 'cldevice1234567890abcd',
        from: '2025-12-01T00:00:00.000Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'cldevice1234567890abcd',
          from: '2025-12-01T00:00:00.000Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by deviceId and to', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        deviceId: 'cldevice1234567890abcd',
        to: '2025-12-31T23:59:59.999Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'cldevice1234567890abcd',
          to: '2025-12-31T23:59:59.999Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by from and to', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        from: '2025-12-01T00:00:00.000Z',
        to: '2025-12-31T23:59:59.999Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2025-12-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter by deviceId, from, and to', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        deviceId: 'cldevice1234567890abcd',
        from: '2025-12-01T00:00:00.000Z',
        to: '2025-12-31T23:59:59.999Z',
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'cldevice1234567890abcd',
          from: '2025-12-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z',
          page: 1,
          pageSize: 100,
        })
      );
    });

    it('should filter with no filters (all optional)', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({});

      expect(repository.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
      });
    });

    it('should handle empty result set', async () => {
      repository.getHistory.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.getHistory({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0); // Math.ceil(0 / 100)
    });

    it('should handle repository errors', async () => {
      const error = new HttpException('Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
      repository.getHistory.mockRejectedValue(error);

      await expect(service.getHistory({})).rejects.toThrow(HttpException);
      await expect(service.getHistory({})).rejects.toMatchObject({
        message: 'Database operation failed',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should serialize borrowedAt dates correctly', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      const result = await service.getHistory({});

      expect(result.data[0].borrowedAt).toBe('2025-12-20T10:00:00.000Z');
      expect(typeof result.data[0].borrowedAt).toBe('string');
    });

    it('should serialize returnedAt dates correctly', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      const result = await service.getHistory({});

      expect(result.data[0].returnedAt).toBe('2025-12-20T18:00:00.000Z');
      expect(typeof result.data[0].returnedAt).toBe('string');
    });

    it('should handle null returnedAt for active loans', async () => {
      const activeHistoryResult: HistoryResult = {
        data: [
          {
            ...mockHistoryResult.data[0],
            returnedAt: null,
          },
        ],
        total: 1,
      };
      repository.getHistory.mockResolvedValue(activeHistoryResult);

      const result = await service.getHistory({});

      expect(result.data[0].returnedAt).toBeNull();
    });

    it('should validate German error messages from Zod', async () => {
      try {
        await service.getHistory({
          from: '2024-01-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z', // More than 365 days
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const message = (error as BadRequestException).message;
        expect(message).toContain('365');
        expect(message).toContain('Tage');
      }
    });

    it('should handle edge case: page beyond total pages', async () => {
      repository.getHistory.mockResolvedValue({
        data: [],
        total: 10,
      });

      const result = await service.getHistory({
        page: 5, // Only 1 page exists (10 items / 100 pageSize)
        pageSize: 100,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.page).toBe(5);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle edge case: pageSize = 1', async () => {
      repository.getHistory.mockResolvedValue({
        data: [mockHistoryResult.data[0]],
        total: 100,
      });

      const result = await service.getHistory({
        pageSize: 1,
      });

      expect(result.data.length).toBe(1);
      expect(result.meta.pageSize).toBe(1);
      expect(result.meta.totalPages).toBe(100); // Math.ceil(100 / 1)
    });

    it('should handle edge case: total = 0', async () => {
      repository.getHistory.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.getHistory({});

      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0); // Math.ceil(0 / 100)
    });

    it('should handle edge case: exactly 100 items (1 page)', async () => {
      repository.getHistory.mockResolvedValue({
        data: Array(100).fill(mockHistoryResult.data[0]),
        total: 100,
      });

      const result = await service.getHistory({
        pageSize: 100,
      });

      expect(result.meta.total).toBe(100);
      expect(result.meta.totalPages).toBe(1); // Math.ceil(100 / 100)
    });

    it('should handle edge case: exactly 101 items (2 pages)', async () => {
      repository.getHistory.mockResolvedValue({
        data: Array(100).fill(mockHistoryResult.data[0]),
        total: 101,
      });

      const result = await service.getHistory({
        pageSize: 100,
      });

      expect(result.meta.total).toBe(101);
      expect(result.meta.totalPages).toBe(2); // Math.ceil(101 / 100)
    });

    it('should coerce string page to number', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        page: '3' as any, // Simulating query param from HTTP request
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          pageSize: 100,
        })
      );
    });

    it('should coerce string pageSize to number', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        pageSize: '50' as any, // Simulating query param from HTTP request
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 50,
        })
      );
    });

    it('should reject negative page number', async () => {
      await expect(service.getHistory({
        page: -1,
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject zero page number', async () => {
      await expect(service.getHistory({
        page: 0,
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject zero pageSize', async () => {
      await expect(service.getHistory({
        pageSize: 0,
      })).rejects.toThrow(BadRequestException);
    });

    it('should accept valid date range exactly 365 days', async () => {
      repository.getHistory.mockResolvedValue(mockHistoryResult);

      await service.getHistory({
        from: '2024-12-23T00:00:00.000Z',
        to: '2025-12-23T00:00:00.000Z', // Exactly 365 days
      });

      expect(repository.getHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2024-12-23T00:00:00.000Z',
          to: '2025-12-23T00:00:00.000Z',
        })
      );
    });

    it('should handle repository timeout errors', async () => {
      const error = new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
      repository.getHistory.mockRejectedValue(error);

      await expect(service.getHistory({})).rejects.toThrow(HttpException);
      await expect(service.getHistory({})).rejects.toMatchObject({
        message: 'Request timeout',
        status: HttpStatus.REQUEST_TIMEOUT,
      });
    });
  });
});
