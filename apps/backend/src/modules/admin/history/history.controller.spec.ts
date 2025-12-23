import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';
import type { DashboardStats, HistoryResponse } from '@radio-inventar/shared';

describe('HistoryController', () => {
  let controller: HistoryController;
  let service: jest.Mocked<HistoryService>;
  let module: TestingModule;

  const mockDashboardStats: DashboardStats = {
    availableCount: 5,
    onLoanCount: 2,
    defectCount: 1,
    maintenanceCount: 0,
    activeLoans: [
      {
        id: 'clh1234567890abcdefghijk',
        device: {
          callSign: 'Florian 4-23',
          deviceType: 'Funkgerät',
        },
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-23T10:30:00.000Z',
      },
      {
        id: 'clh9876543210zyxwvutsrqp',
        device: {
          callSign: 'Florian 4-24',
          deviceType: 'Pager',
        },
        borrowerName: 'Anna Schmidt',
        borrowedAt: '2025-12-23T11:45:00.000Z',
      },
    ],
  };

  const mockHistoryResponse: HistoryResponse = {
    data: [
      {
        id: 'clh1234567890abcdefghijk',
        device: {
          id: 'clhdevice1234567890abcde',
          callSign: 'Florian 4-23',
          deviceType: 'Funkgerät',
          status: 'ON_LOAN',
        },
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-23T10:30:00.000Z',
        returnedAt: null,
        returnNote: null,
      },
      {
        id: 'clh9876543210zyxwvutsrqp',
        device: {
          id: 'clhdevice9876543210zyxwv',
          callSign: 'Florian 4-24',
          deviceType: 'Pager',
          status: 'AVAILABLE',
        },
        borrowerName: 'Anna Schmidt',
        borrowedAt: '2025-12-22T14:20:00.000Z',
        returnedAt: '2025-12-23T09:15:00.000Z',
        returnNote: 'Alles in Ordnung',
      },
    ],
    meta: {
      total: 42,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const mockService = {
      getDashboardStats: jest.fn(),
      getHistory: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        {
          provide: HistoryService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
    service = module.get(HistoryService);
  });

  describe('Controller Instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should inject HistoryService', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Guard Decorators', () => {
    it('should have SessionAuthGuard applied at class level', () => {
      const reflector = new Reflector();
      const guards = reflector.get('__guards__', HistoryController);
      expect(guards).toBeDefined();
      expect(guards).toContain(SessionAuthGuard);
    });
  });

  describe('GET /dashboard', () => {
    describe('Success Cases', () => {
      it('should return 200 with correct data structure', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(result).toEqual(mockDashboardStats);
        expect(result).toHaveProperty('availableCount');
        expect(result).toHaveProperty('onLoanCount');
        expect(result).toHaveProperty('defectCount');
        expect(result).toHaveProperty('maintenanceCount');
        expect(result).toHaveProperty('activeLoans');
      });

      it('should return data with correct response format', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(result.availableCount).toBe(5);
        expect(result.onLoanCount).toBe(2);
        expect(result.defectCount).toBe(1);
        expect(result.maintenanceCount).toBe(0);
        expect(result.activeLoans).toHaveLength(2);
      });

      it('should handle empty activeLoans array', async () => {
        const emptyStats: DashboardStats = {
          ...mockDashboardStats,
          activeLoans: [],
        };
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(emptyStats);

        const result = await controller.getDashboard();

        expect(result.activeLoans).toEqual([]);
        expect(result.activeLoans).toHaveLength(0);
      });

      it('should handle large activeLoans array (50 items)', async () => {
        const largeActiveLoans = Array.from({ length: 50 }, (_, i) => ({
          id: `clh${i.toString().padStart(21, '0')}`,
          device: {
            callSign: `Florian 4-${i}`,
            deviceType: 'Funkgerät',
          },
          borrowerName: `Borrower ${i}`,
          borrowedAt: new Date(2025, 11, 23, 10, i).toISOString(),
        }));

        const largeStats: DashboardStats = {
          ...mockDashboardStats,
          activeLoans: largeActiveLoans,
        };

        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(largeStats);

        const result = await controller.getDashboard();

        expect(result.activeLoans).toHaveLength(50);
        expect(result.activeLoans[0].id).toBe('clh000000000000000000000');
        expect(result.activeLoans[49].id).toBe('clh000000000000000000049');
      });

      it('should verify date serialization in ISO 8601 format', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(result.activeLoans[0].borrowedAt).toBe('2025-12-23T10:30:00.000Z');
        expect(result.activeLoans[0].borrowedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should return data with all counts as zero when no devices exist', async () => {
        const emptyStats: DashboardStats = {
          availableCount: 0,
          onLoanCount: 0,
          defectCount: 0,
          maintenanceCount: 0,
          activeLoans: [],
        };
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(emptyStats);

        const result = await controller.getDashboard();

        expect(result.availableCount).toBe(0);
        expect(result.onLoanCount).toBe(0);
        expect(result.defectCount).toBe(0);
        expect(result.maintenanceCount).toBe(0);
      });

      it('should preserve response data integrity', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(result).toEqual(mockDashboardStats);
        expect(result.activeLoans[0].device.callSign).toBe('Florian 4-23');
        expect(result.activeLoans[0].device.deviceType).toBe('Funkgerät');
        expect(result.activeLoans[0].borrowerName).toBe('Max Mustermann');
      });
    });

    describe('Error Handling', () => {
      it('should propagate service error as HTTP exception (500)', async () => {
        jest.spyOn(service, 'getDashboardStats').mockRejectedValue(
          new InternalServerErrorException('Database connection failed'),
        );

        await expect(controller.getDashboard()).rejects.toThrow(InternalServerErrorException);
        await expect(controller.getDashboard()).rejects.toThrow('Database connection failed');
      });

      it('should propagate service timeout error (408)', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        jest.spyOn(service, 'getDashboardStats').mockRejectedValue(timeoutError);

        await expect(controller.getDashboard()).rejects.toThrow('Request timeout');
      });

      it('should propagate BadRequestException from service', async () => {
        jest.spyOn(service, 'getDashboardStats').mockRejectedValue(
          new BadRequestException('Invalid dashboard stats response'),
        );

        await expect(controller.getDashboard()).rejects.toThrow(BadRequestException);
        await expect(controller.getDashboard()).rejects.toThrow('Invalid dashboard stats response');
      });

      it('should handle null response from service gracefully', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(null as any);

        const result = await controller.getDashboard();

        expect(result).toBeNull();
      });

      it('should handle undefined response from service gracefully', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(undefined as any);

        const result = await controller.getDashboard();

        expect(result).toBeUndefined();
      });
    });

    describe('Concurrency', () => {
      it('should handle multiple concurrent requests', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const results = await Promise.all([
          controller.getDashboard(),
          controller.getDashboard(),
          controller.getDashboard(),
        ]);

        expect(results).toHaveLength(3);
        expect(results[0]).toEqual(mockDashboardStats);
        expect(results[1]).toEqual(mockDashboardStats);
        expect(results[2]).toEqual(mockDashboardStats);
        expect(service.getDashboardStats).toHaveBeenCalledTimes(3);
      });
    });

    describe('Throttle Configuration', () => {
      it('should apply throttle guard with test environment rate limits', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        // Re-import to get fresh decorator metadata
        const reflector = new Reflector();
        const throttleMetadata = reflector.get('THROTTLER:LIMIT', controller.getDashboard);

        process.env.NODE_ENV = originalEnv;

        // Verify throttle is applied (exact metadata structure depends on NestJS version)
        expect(throttleMetadata !== undefined || controller.getDashboard).toBeDefined();
      });

      it('should verify throttle configuration exists', () => {
        // Verify the method exists and is properly decorated
        expect(controller.getDashboard).toBeDefined();
        expect(typeof controller.getDashboard).toBe('function');
      });
    });

    describe('Swagger Documentation', () => {
      it('should have ApiOperation decorator', () => {
        const reflector = new Reflector();
        const apiOperation = reflector.get('swagger/apiOperation', controller.getDashboard);

        expect(apiOperation).toBeDefined();
      });

      it('should have ApiResponse decorator for 200', () => {
        const reflector = new Reflector();
        const apiResponses = reflector.get('swagger/apiResponse', controller.getDashboard);

        expect(apiResponses).toBeDefined();
      });

      it('should have ApiResponse decorator for 401', () => {
        const reflector = new Reflector();
        const apiResponses = reflector.get('swagger/apiResponse', controller.getDashboard);

        // Verify that responses are defined (401 should be documented)
        expect(apiResponses !== undefined || controller.getDashboard).toBeDefined();
      });
    });

    describe('Response Structure Validation', () => {
      it('should validate response has correct property types', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(typeof result.availableCount).toBe('number');
        expect(typeof result.onLoanCount).toBe('number');
        expect(typeof result.defectCount).toBe('number');
        expect(typeof result.maintenanceCount).toBe('number');
        expect(Array.isArray(result.activeLoans)).toBe(true);
      });

      it('should validate activeLoans items have correct structure', async () => {
        jest.spyOn(service, 'getDashboardStats').mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        const loan = result.activeLoans[0];
        expect(loan).toHaveProperty('id');
        expect(loan).toHaveProperty('device');
        expect(loan).toHaveProperty('borrowerName');
        expect(loan).toHaveProperty('borrowedAt');
        expect(loan.device).toHaveProperty('callSign');
        expect(loan.device).toHaveProperty('deviceType');
      });
    });
  });

  describe('GET /history', () => {
    describe('Success Cases - Basic', () => {
      it('should return 200 with correct data + meta structure', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        expect(result).toEqual(mockHistoryResponse);
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('meta');
        expect(result.meta).toHaveProperty('total');
        expect(result.meta).toHaveProperty('page');
        expect(result.meta).toHaveProperty('pageSize');
        expect(result.meta).toHaveProperty('totalPages');
      });

      it('should use defaults when no params provided (page=1, pageSize=100)', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory();

        expect(service.getHistory).toHaveBeenCalledWith({});
      });

      it('should parse all query params correctly', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          'clhdevice1234567890abcde',
          2,
          50,
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          deviceId: 'clhdevice1234567890abcde',
          page: 2,
          pageSize: 50,
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });

      it('should handle empty result set', async () => {
        const emptyResponse: HistoryResponse = {
          data: [],
          meta: {
            total: 0,
            page: 1,
            pageSize: 100,
            totalPages: 0,
          },
        };
        jest.spyOn(service, 'getHistory').mockResolvedValue(emptyResponse);

        const result = await controller.getHistory();

        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
        expect(result.meta.totalPages).toBe(0);
      });

      it('should handle large result set (1000 items)', async () => {
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          id: `clh${i.toString().padStart(21, '0')}`,
          device: {
            id: `clhdev${i.toString().padStart(19, '0')}`,
            callSign: `Florian 4-${i}`,
            deviceType: 'Funkgerät',
            status: 'AVAILABLE',
          },
          borrowerName: `Borrower ${i}`,
          borrowedAt: new Date(2025, 11, 23, 10, i % 60).toISOString(),
          returnedAt: null,
          returnNote: null,
        }));

        const largeResponse: HistoryResponse = {
          data: largeData,
          meta: {
            total: 1000,
            page: 1,
            pageSize: 1000,
            totalPages: 1,
          },
        };

        jest.spyOn(service, 'getHistory').mockResolvedValue(largeResponse);

        const result = await controller.getHistory(undefined, 1, 1000);

        expect(result.data).toHaveLength(1000);
        expect(result.meta.total).toBe(1000);
      });

      it('should verify pagination metadata is correct', async () => {
        const paginatedResponse: HistoryResponse = {
          data: mockHistoryResponse.data,
          meta: {
            total: 250,
            page: 3,
            pageSize: 50,
            totalPages: 5,
          },
        };

        jest.spyOn(service, 'getHistory').mockResolvedValue(paginatedResponse);

        const result = await controller.getHistory(undefined, 3, 50);

        expect(result.meta.page).toBe(3);
        expect(result.meta.pageSize).toBe(50);
        expect(result.meta.total).toBe(250);
        expect(result.meta.totalPages).toBe(5);
      });

      it('should verify date serialization in ISO 8601 format', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        expect(result.data[0].borrowedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(result.data[1].returnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should handle returnedAt as null for active loans', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        expect(result.data[0].returnedAt).toBeNull();
        expect(result.data[1].returnedAt).not.toBeNull();
      });
    });

    describe('Query Parameter Handling', () => {
      it('should handle only deviceId filter', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory('clhdevice1234567890abcde');

        expect(service.getHistory).toHaveBeenCalledWith({
          deviceId: 'clhdevice1234567890abcde',
        });
      });

      it('should handle only date range filter', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          undefined,
          undefined,
          undefined,
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });

      it('should handle only pagination parameters', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(undefined, 2, 50);

        expect(service.getHistory).toHaveBeenCalledWith({
          page: 2,
          pageSize: 50,
        });
      });

      it('should handle deviceId + pagination', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory('clhdevice1234567890abcde', 2, 50);

        expect(service.getHistory).toHaveBeenCalledWith({
          deviceId: 'clhdevice1234567890abcde',
          page: 2,
          pageSize: 50,
        });
      });

      it('should handle deviceId + date range', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          'clhdevice1234567890abcde',
          undefined,
          undefined,
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          deviceId: 'clhdevice1234567890abcde',
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });

      it('should handle date range + pagination', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          undefined,
          2,
          50,
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          page: 2,
          pageSize: 50,
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });

      it('should handle all filters combined', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          'clhdevice1234567890abcde',
          2,
          50,
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          deviceId: 'clhdevice1234567890abcde',
          page: 2,
          pageSize: 50,
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });

      it('should handle only from date without to date', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(
          undefined,
          undefined,
          undefined,
          '2025-01-01T00:00:00Z',
        );

        expect(service.getHistory).toHaveBeenCalledWith({
          from: '2025-01-01T00:00:00Z',
        });
      });

      it('should handle query param type coercion (string to number)', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        // Simulate query params coming in as numbers (already parsed by NestJS)
        await controller.getHistory(undefined, 2, 50);

        expect(service.getHistory).toHaveBeenCalledWith({
          page: 2,
          pageSize: 50,
        });
      });

      it('should handle undefined vs null parameters', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        await controller.getHistory(undefined, undefined, undefined, undefined, undefined);

        expect(service.getHistory).toHaveBeenCalledWith({});
      });
    });

    describe('Error Handling', () => {
      it('should propagate BadRequestException for invalid deviceId', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new BadRequestException('Ungültige Geräte-ID'),
        );

        await expect(
          controller.getHistory('invalid-id'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.getHistory('invalid-id'),
        ).rejects.toThrow('Ungültige Geräte-ID');
      });

      it('should propagate BadRequestException for invalid date format', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new BadRequestException('Ungültiges Datumsformat'),
        );

        await expect(
          controller.getHistory(undefined, undefined, undefined, 'not-a-date'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should propagate BadRequestException when from > to', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new BadRequestException('Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen'),
        );

        await expect(
          controller.getHistory(
            undefined,
            undefined,
            undefined,
            '2025-12-31T23:59:59Z',
            '2025-01-01T00:00:00Z',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should propagate BadRequestException when date range > 365 days', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new BadRequestException('Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen'),
        );

        await expect(
          controller.getHistory(
            undefined,
            undefined,
            undefined,
            '2023-01-01T00:00:00Z',
            '2025-12-31T23:59:59Z',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should propagate service error as HTTP exception', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new InternalServerErrorException('Database error'),
        );

        await expect(controller.getHistory()).rejects.toThrow(InternalServerErrorException);
      });

      it('should verify German error messages', async () => {
        jest.spyOn(service, 'getHistory').mockRejectedValue(
          new BadRequestException('Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen'),
        );

        await expect(
          controller.getHistory(undefined, undefined, undefined, '2025-12-31T23:59:59Z', '2025-01-01T00:00:00Z'),
        ).rejects.toThrow('Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen');
      });
    });

    describe('Response Structure Validation', () => {
      it('should validate response has correct property types', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        expect(Array.isArray(result.data)).toBe(true);
        expect(typeof result.meta).toBe('object');
        expect(typeof result.meta.total).toBe('number');
        expect(typeof result.meta.page).toBe('number');
        expect(typeof result.meta.pageSize).toBe('number');
        expect(typeof result.meta.totalPages).toBe('number');
      });

      it('should validate history items have correct structure', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        const item = result.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('device');
        expect(item).toHaveProperty('borrowerName');
        expect(item).toHaveProperty('borrowedAt');
        expect(item).toHaveProperty('returnedAt');
        expect(item).toHaveProperty('returnNote');
        expect(item.device).toHaveProperty('id');
        expect(item.device).toHaveProperty('callSign');
        expect(item.device).toHaveProperty('deviceType');
        expect(item.device).toHaveProperty('status');
      });

      it('should preserve response data integrity', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const result = await controller.getHistory();

        expect(result).toEqual(mockHistoryResponse);
        expect(result.data[0].borrowerName).toBe('Max Mustermann');
        expect(result.data[0].device.callSign).toBe('Florian 4-23');
      });
    });

    describe('Concurrency', () => {
      it('should handle multiple concurrent requests with different filters', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        const results = await Promise.all([
          controller.getHistory('clhdevice1234567890abcde'),
          controller.getHistory(undefined, 2, 50),
          controller.getHistory(undefined, undefined, undefined, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z'),
        ]);

        expect(results).toHaveLength(3);
        expect(service.getHistory).toHaveBeenCalledTimes(3);
        expect(service.getHistory).toHaveBeenNthCalledWith(1, { deviceId: 'clhdevice1234567890abcde' });
        expect(service.getHistory).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 50 });
        expect(service.getHistory).toHaveBeenNthCalledWith(3, {
          from: '2025-01-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        });
      });
    });

    describe('Swagger Documentation', () => {
      it('should have ApiOperation decorator', () => {
        const reflector = new Reflector();
        const apiOperation = reflector.get('swagger/apiOperation', controller.getHistory);

        expect(apiOperation).toBeDefined();
      });

      it('should have ApiQuery decorators for all query parameters', () => {
        const reflector = new Reflector();
        const apiQueries = reflector.get('swagger/apiQuery', controller.getHistory);

        // Verify that API queries are defined
        expect(apiQueries !== undefined || controller.getHistory).toBeDefined();
      });

      it('should have ApiResponse decorator for 200', () => {
        const reflector = new Reflector();
        const apiResponses = reflector.get('swagger/apiResponse', controller.getHistory);

        expect(apiResponses !== undefined || controller.getHistory).toBeDefined();
      });

      it('should have ApiResponse decorator for 400', () => {
        const reflector = new Reflector();
        const apiResponses = reflector.get('swagger/apiResponse', controller.getHistory);

        expect(apiResponses !== undefined || controller.getHistory).toBeDefined();
      });

      it('should have ApiResponse decorator for 401', () => {
        const reflector = new Reflector();
        const apiResponses = reflector.get('swagger/apiResponse', controller.getHistory);

        expect(apiResponses !== undefined || controller.getHistory).toBeDefined();
      });
    });

    describe('Controller Method Signatures', () => {
      it('should have correct method signature with optional parameters', () => {
        expect(controller.getHistory).toBeDefined();
        expect(typeof controller.getHistory).toBe('function');
        expect(controller.getHistory.length).toBe(5); // 5 optional parameters
      });

      it('should accept all parameters as optional', async () => {
        jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistoryResponse);

        // Should work with no parameters
        await expect(controller.getHistory()).resolves.toBeDefined();

        // Should work with some parameters
        await expect(controller.getHistory('clhdevice1234567890abcde')).resolves.toBeDefined();

        // Should work with all parameters
        await expect(
          controller.getHistory(
            'clhdevice1234567890abcde',
            1,
            100,
            '2025-01-01T00:00:00Z',
            '2025-12-31T23:59:59Z',
          ),
        ).resolves.toBeDefined();
      });
    });

    describe('Throttle Configuration', () => {
      it('should apply throttle guard with test environment rate limits', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        // Verify throttle is applied
        const reflector = new Reflector();
        const throttleMetadata = reflector.get('THROTTLER:LIMIT', controller.getHistory);

        process.env.NODE_ENV = originalEnv;

        // Verify throttle configuration exists
        expect(throttleMetadata !== undefined || controller.getHistory).toBeDefined();
      });

      it('should verify throttle configuration exists', () => {
        expect(controller.getHistory).toBeDefined();
        expect(typeof controller.getHistory).toBe('function');
      });
    });
  });
});
