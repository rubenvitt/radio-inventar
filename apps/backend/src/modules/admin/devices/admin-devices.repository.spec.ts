import { Test, TestingModule } from '@nestjs/testing';
import { AdminDevicesRepository } from './admin-devices.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';

describe('AdminDevicesRepository', () => {
  let repository: AdminDevicesRepository;
  let prisma: {
    device: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  // Fixed dates for deterministic tests
  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevice = {
    id: 'cuid1234567890abcdefghij',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    status: 'AVAILABLE' as const,
    notes: 'Test device',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockDeviceOnLoan = {
    ...mockDevice,
    id: 'cuid-on-loan-device',
    status: 'ON_LOAN' as const,
  };

  beforeEach(async () => {
    prisma = {
      device: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDevicesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<AdminDevicesRepository>(AdminDevicesRepository);
  });

  describe('create', () => {
    const createDto = {
      callSign: 'Florian 4-22',
      serialNumber: 'SN-002',
      deviceType: 'Vehicle',
      notes: 'New device',
    };

    it('should create a device successfully', async () => {
      const expectedDevice = { ...mockDevice, ...createDto };

      // Mock transaction callback - create() now uses $transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            create: jest.fn().mockResolvedValue(expectedDevice),
          },
        });
      });

      const result = await repository.create(createDto);

      expect(result).toEqual(expectedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should create device with null serialNumber when not provided', async () => {
      const dtoWithoutSerial = {
        callSign: 'Florian 4-23',
        deviceType: 'Handheld',
      };
      const expectedDevice = {
        ...mockDevice,
        ...dtoWithoutSerial,
        serialNumber: null,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            create: jest.fn().mockResolvedValue(expectedDevice),
          },
        });
      });

      const result = await repository.create(dtoWithoutSerial);

      expect(result).toEqual(expectedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should create device with null notes when not provided', async () => {
      const dtoWithoutNotes = {
        callSign: 'Florian 4-24',
        serialNumber: 'SN-003',
        deviceType: 'Base',
      };
      const expectedDevice = { ...mockDevice, ...dtoWithoutNotes, notes: null };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            create: jest.fn().mockResolvedValue(expectedDevice),
          },
        });
      });

      const result = await repository.create(dtoWithoutNotes);

      expect(result).toEqual(expectedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException (409) when callSign already exists (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(repository.create(createDto)).rejects.toThrow(
        'Funkruf existiert bereits',
      );
    });

    it('should throw HttpException (500) on other database errors', async () => {
      const dbError = new Error('Database connection failed');
      prisma.$transaction.mockRejectedValue(dbError);

      await expect(repository.create(createDto)).rejects.toThrow(
        HttpException,
      );
      await expect(repository.create(createDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('update', () => {
    const deviceId = 'cuid-update-test';
    const updateDto = {
      callSign: 'Florian 4-99',
      serialNumber: 'SN-099',
      deviceType: 'Updated Type',
      notes: 'Updated notes',
    };

    it('should update a device successfully', async () => {
      const updatedDevice = { ...mockDevice, ...updateDto };

      // Mock transaction callback
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockResolvedValue(updatedDevice),
          },
        });
      });

      const result = await repository.update(deviceId, updateDto);

      expect(result).toEqual(updatedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { callSign: 'Florian 4-88' };
      const updatedDevice = { ...mockDevice, ...partialUpdate };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockResolvedValue(updatedDevice),
          },
        });
      });

      const result = await repository.update(deviceId, partialUpdate);

      expect(result).toEqual(updatedDevice);
    });

    it('should throw NotFoundException (404) when device does not exist', async () => {
      // Device not found - P2025 error is thrown by Prisma when update target doesn't exist
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        'Gerät nicht gefunden',
      );
    });

    it('should throw ConflictException (409) when callSign already exists (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        'Funkruf existiert bereits',
      );
    });

    it('should handle P2025 error (record not found during update)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        'Gerät nicht gefunden',
      );
    });

    it('should handle race condition between findUnique and update', async () => {
      // Simulate race condition: device exists on check but deleted before update
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException (500) on other database errors', async () => {
      const dbError = new Error('Database connection failed');
      prisma.$transaction.mockRejectedValue(dbError);

      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        HttpException,
      );
      await expect(repository.update(deviceId, updateDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should rollback transaction on update failure', async () => {
      const updateError = new Error('Update failed mid-transaction');

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockRejectedValue(updateError),
          },
        };
        return callback(tx);
      });

      await expect(
        repository.update(deviceId, { callSign: 'Will Fail' }),
      ).rejects.toThrow(HttpException);
      // Transaction should have been called (rollback happens automatically on error)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const deviceId = 'cuid-status-test';

    it('should update device status to AVAILABLE successfully', async () => {
      const updatedDevice = { ...mockDevice, status: 'AVAILABLE' as const };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockResolvedValue(updatedDevice),
          },
        });
      });

      const result = await repository.updateStatus(deviceId, 'AVAILABLE');

      expect(result).toEqual(updatedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should update device status to MAINTENANCE successfully', async () => {
      const updatedDevice = { ...mockDevice, status: 'MAINTENANCE' as const };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockResolvedValue(updatedDevice),
          },
        });
      });

      const result = await repository.updateStatus(deviceId, 'MAINTENANCE');

      expect(result).toEqual(updatedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should update device status to DEFECT successfully', async () => {
      const updatedDevice = {
        ...mockDevice,
        status: 'DEFECT' as const,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDevice),
            update: jest.fn().mockResolvedValue(updatedDevice),
          },
        });
      });

      const result = await repository.updateStatus(deviceId, 'DEFECT');

      expect(result).toEqual(updatedDevice);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException (400) when trying to set status to ON_LOAN', async () => {
      await expect(
        repository.updateStatus(deviceId, 'ON_LOAN'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.updateStatus(deviceId, 'ON_LOAN'),
      ).rejects.toThrow('Status ON_LOAN kann nicht manuell gesetzt werden');

      // Verify Prisma was never called
      expect(prisma.device.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException (404) when device does not exist (P2025)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(
        repository.updateStatus(deviceId, 'AVAILABLE'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        repository.updateStatus(deviceId, 'AVAILABLE'),
      ).rejects.toThrow('Gerät nicht gefunden');
    });

    it('should throw HttpException (500) on other database errors', async () => {
      const dbError = new Error('Database connection failed');

      prisma.$transaction.mockRejectedValue(dbError);

      await expect(
        repository.updateStatus(deviceId, 'AVAILABLE'),
      ).rejects.toThrow(HttpException);
      await expect(
        repository.updateStatus(deviceId, 'AVAILABLE'),
      ).rejects.toThrow('Database operation failed');
    });
  });

  describe('delete', () => {
    const deviceId = 'cuid-delete-test';

    it('should delete device successfully with atomic deleteMany', async () => {
      // FIX: delete() now uses findUnique + delete inside transaction to prevent TOCTOU race condition
      // Also deletes associated loans before deleting the device
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue({
              id: deviceId,
              callSign: 'TEST-001',
              status: 'AVAILABLE',
              deviceType: 'Radio',
              serialNumber: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            delete: jest.fn().mockResolvedValue({
              id: deviceId,
              callSign: 'TEST-001',
              status: 'AVAILABLE',
              deviceType: 'Radio',
              serialNumber: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          loan: {
            deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        });
      });

      await repository.delete(deviceId);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException (404) when device does not exist', async () => {
      // findUnique returns null when device doesn't exist
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn(), // Not called when device not found
          },
          loan: {
            deleteMany: jest.fn(), // Not called when device not found
          },
        });
      });

      await expect(repository.delete(deviceId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.delete(deviceId)).rejects.toThrow(
        'Gerät nicht gefunden',
      );
    });

    it('should throw ConflictException (409) when device is ON_LOAN', async () => {
      // findUnique returns ON_LOAN device, preventing deletion
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          device: {
            findUnique: jest.fn().mockResolvedValue(mockDeviceOnLoan),
            delete: jest.fn(), // Not called when status is ON_LOAN
          },
          loan: {
            deleteMany: jest.fn(), // Not called when status is ON_LOAN
          },
        });
      });

      await expect(repository.delete(deviceId)).rejects.toThrow(
        ConflictException,
      );
      await expect(repository.delete(deviceId)).rejects.toThrow(
        'Gerät kann nicht gelöscht werden, da es ausgeliehen ist',
      );
    });

    it('should handle P2025 error (record not found during delete)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.delete(deviceId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.delete(deviceId)).rejects.toThrow(
        'Gerät nicht gefunden',
      );
    });

    it('should throw HttpException (500) on other database errors', async () => {
      const dbError = new Error('Database connection failed');
      prisma.$transaction.mockRejectedValue(dbError);

      await expect(repository.delete(deviceId)).rejects.toThrow(HttpException);
      await expect(repository.delete(deviceId)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should handle race condition atomically with deleteMany', async () => {
      // deleteMany with WHERE clause handles race condition atomically
      // If device status changes between check and delete, deleteMany just returns count: 0
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.delete(deviceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    const deviceId = 'cuid-find-by-id-test';

    it('should return device when found', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);

      const result = await repository.findById(deviceId);

      expect(result).toEqual(mockDevice);
      expect(prisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: deviceId },
      });
    });

    it('should return null when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      const result = await repository.findById(deviceId);

      expect(result).toBeNull();
      expect(prisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: deviceId },
      });
    });

    it('should accept valid CUID2 format IDs', async () => {
      // CUID2 format: 24-32 lowercase alphanumeric characters
      const validCuid2Ids = [
        'cm4abc123def456789012345', // 24 chars (default)
        'cm4xyz987fed654321098765abcd', // 28 chars
        'cm4test123456789012345678901', // 31 chars
        'cm4test1234567890123456789012', // 32 chars (max)
      ];

      for (const validId of validCuid2Ids) {
        prisma.device.findUnique.mockResolvedValue({ ...mockDevice, id: validId });
        const result = await repository.findById(validId);
        expect(result).toEqual({ ...mockDevice, id: validId });
      }
    });

    it('should throw HttpException (500) on database errors', async () => {
      const dbError = new Error('Database connection failed');
      prisma.device.findUnique.mockRejectedValue(dbError);

      await expect(repository.findById(deviceId)).rejects.toThrow(
        HttpException,
      );
      await expect(repository.findById(deviceId)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('findAll', () => {
    const mockDevices = [
      mockDevice,
      { ...mockDevice, id: 'cuid-2', callSign: 'Florian 4-22' },
      { ...mockDevice, id: 'cuid-3', callSign: 'Florian 4-23' },
    ];

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

    it('should filter by status AVAILABLE when provided', async () => {
      const availableDevices = mockDevices.filter(
        (d) => d.status === 'AVAILABLE',
      );
      prisma.device.findMany.mockResolvedValue(availableDevices);

      const result = await repository.findAll({ status: 'AVAILABLE' });

      expect(result).toEqual(availableDevices);
      expect(prisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'AVAILABLE' },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 100,
        skip: 0,
      });
    });

    it('should filter by status ON_LOAN when provided', async () => {
      const onLoanDevices = [mockDeviceOnLoan];
      prisma.device.findMany.mockResolvedValue(onLoanDevices);

      const result = await repository.findAll({ status: 'ON_LOAN' });

      expect(result).toEqual(onLoanDevices);
      expect(prisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'ON_LOAN' },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 100,
        skip: 0,
      });
    });

    it('should filter by status MAINTENANCE when provided', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ status: 'MAINTENANCE' });

      expect(prisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'MAINTENANCE' },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 100,
        skip: 0,
      });
    });

    it('should apply custom pagination with take and skip', async () => {
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

    it('should handle negative skip by setting it to 0', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ skip: -10 });

      const call = prisma.device.findMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
    });

    it('should handle take=0 edge case', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({ take: 0 });

      const call = prisma.device.findMany.mock.calls[0][0];
      // take=0 is passed through as-is (0 is a valid value for Prisma, returns empty array)
      expect(call.take).toBe(0);
    });

    it('should order by status first, then callSign ascending', async () => {
      prisma.device.findMany.mockResolvedValue(mockDevices);

      await repository.findAll();

      const call = prisma.device.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual([{ status: 'asc' }, { callSign: 'asc' }]);
    });

    it('should combine status filter with pagination', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      await repository.findAll({
        status: 'AVAILABLE',
        take: 25,
        skip: 5,
      });

      expect(prisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'AVAILABLE' },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: 25,
        skip: 5,
      });
    });

    it('should return empty array when no devices found', async () => {
      prisma.device.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should throw HttpException (500) on database errors', async () => {
      const dbError = new Error('Database connection failed');
      prisma.device.findMany.mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toThrow(HttpException);
      await expect(repository.findAll()).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should sanitize database errors to prevent information leakage', async () => {
      const detailedError = new Error(
        'Connection to database failed at host db.internal.company.com',
      );
      prisma.device.findMany.mockRejectedValue(detailedError);

      // Single try-catch pattern is more reliable than dual expect
      try {
        await repository.findAll();
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).message).toBe('Database operation failed');
        expect((error as HttpException).message).not.toContain('db.internal');
      }
    });
  });
});
