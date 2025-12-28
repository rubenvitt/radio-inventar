import { Test, TestingModule } from '@nestjs/testing';
import { DevicesRepository } from './devices.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('DevicesRepository', () => {
  let repository: DevicesRepository;
  let prisma: {
    device: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  // M1 Fix: Use fixed dates for deterministic tests
  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevices = [
    {
      id: 'cuid1234567890abcdefghij',
      callSign: 'Florian 4-21',
      serialNumber: 'SN-001',
      deviceType: 'Handheld',
      status: 'AVAILABLE' as const,
      notes: 'Neues Gerät',
      createdAt: mockDate,
      updatedAt: mockDate,
    },
  ];

  beforeEach(async () => {
    prisma = {
      device: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<DevicesRepository>(DevicesRepository);
  });

  describe('findAll', () => {
    it('should return all devices with default pagination when no options provided', async () => {
      prisma.device.findMany.mockResolvedValue(mockDevices);

      const result = await repository.findAll();

      expect(result).toEqual(mockDevices);
      expect(prisma.device.findMany).toHaveBeenCalledWith({
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 100, // DEFAULT_PAGE_SIZE
        skip: 0,
      });
    });

    it('should filter by status when provided', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ status: 'AVAILABLE' });

      expect(prisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'AVAILABLE' },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 100,
        skip: 0,
      });
    });

    it('should apply custom pagination options', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ take: 50, skip: 10 });

      const call = prisma.device.findMany.mock.calls[0][0];
      expect(call.take).toBe(50);
      expect(call.skip).toBe(10);
    });

    it('should cap take at MAX_PAGE_SIZE (500)', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ take: 1000 });

      const call = prisma.device.findMany.mock.calls[0][0];
      expect(call.take).toBe(500);
    });

    it('should order by status first, then callSign', async () => {
      prisma.device.findMany.mockResolvedValue(mockDevices);

      await repository.findAll();

      const call = prisma.device.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual([{ status: 'asc' }, { callSign: 'asc' }]);
    });
  });

  describe('error handling', () => {
    // M2 Fix: Errors are now sanitized to prevent information leakage
    // All Prisma errors are wrapped in HttpException with generic message
    it('should throw sanitized HttpException when Prisma query fails', async () => {
      const prismaError = new Error('Prisma connection failed');
      prisma.device.findMany.mockRejectedValue(prismaError);

      await expect(repository.findAll()).rejects.toThrow('Database operation failed');
    });

    it('should throw sanitized HttpException when database connection times out', async () => {
      const timeoutError = new Error('Query timeout');
      prisma.device.findMany.mockRejectedValue(timeoutError);

      await expect(repository.findAll()).rejects.toThrow('Database operation failed');
    });

    it('should throw sanitized HttpException when database constraint is violated', async () => {
      const constraintError = new Error('Unique constraint violation');
      prisma.device.findMany.mockRejectedValue(constraintError);

      await expect(repository.findAll('AVAILABLE')).rejects.toThrow('Database operation failed');
    });

    it('should sanitize Prisma client errors to prevent information leakage', async () => {
      const clientError = new Error('P2002: Unique constraint failed');
      prisma.device.findMany.mockRejectedValue(clientError);

      await expect(repository.findAll()).rejects.toThrow('Database operation failed');
    });
  });
});
