import { Test, TestingModule } from '@nestjs/testing';
import { LoansRepository } from './loans.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('LoansRepository', () => {
  let repository: LoansRepository;
  let prisma: {
    loan: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    device: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  // M1 Fix: Use fixed dates for deterministic tests
  const mockDate = new Date('2025-12-16T10:00:00Z');

  const mockActiveLoans = [
    {
      id: 'loan1abcdefghijklmnopqrs',
      deviceId: 'device1abcdefghijklmnopq',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: null,
      returnNote: null,
      createdAt: mockDate,
      updatedAt: mockDate,
      device: {
        id: 'device1abcdefghijklmnopq',
        callSign: 'Florian 4-22',
        status: 'ON_LOAN' as const,
      },
    },
  ];

  beforeEach(async () => {
    prisma = {
      loan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      device: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<LoansRepository>(LoansRepository);
  });

  describe('findActive', () => {
    it('should return only active loans with default pagination', async () => {
      prisma.loan.findMany.mockResolvedValue(mockActiveLoans);

      const result = await repository.findActive();

      expect(result).toEqual(mockActiveLoans);
      expect(prisma.loan.findMany).toHaveBeenCalledWith({
        where: { returnedAt: null },
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
        orderBy: { borrowedAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should apply custom pagination options', async () => {
      prisma.loan.findMany.mockResolvedValue([]);

      await repository.findActive({ take: 50, skip: 10 });

      const call = prisma.loan.findMany.mock.calls[0][0];
      expect(call.take).toBe(50);
      expect(call.skip).toBe(10);
    });

    it('should cap take at MAX_PAGE_SIZE (500)', async () => {
      prisma.loan.findMany.mockResolvedValue([]);

      await repository.findActive({ take: 1000 });

      const call = prisma.loan.findMany.mock.calls[0][0];
      expect(call.take).toBe(500);
    });

    it('should include device info with id, callSign, status', async () => {
      prisma.loan.findMany.mockResolvedValue(mockActiveLoans);

      await repository.findActive();

      const call = prisma.loan.findMany.mock.calls[0][0];
      expect(call.select.device.select).toEqual({
        id: true,
        callSign: true,
        status: true,
      });
    });

    it('should order by borrowedAt descending (newest first)', async () => {
      prisma.loan.findMany.mockResolvedValue([]);

      await repository.findActive();

      const call = prisma.loan.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ borrowedAt: 'desc' });
    });
  });

  describe('create', () => {
    const createDto = {
      deviceId: 'clz123456789012345678901',
      borrowerName: 'Max Mustermann',
    };
    const mockLoanWithDevice = {
      id: 'loan12345678901234567890',
      deviceId: createDto.deviceId,
      borrowerName: createDto.borrowerName,
      borrowedAt: new Date('2025-12-16T10:30:00Z'),
      returnedAt: null,
      returnNote: null,
      createdAt: mockDate,
      updatedAt: mockDate,
      device: {
        id: createDto.deviceId,
        callSign: 'Florian 4/1',
        status: 'ON_LOAN' as const,
      },
    };

    it('should create loan with transaction', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'AVAILABLE' });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.update.mockResolvedValue({ id: createDto.deviceId, status: 'ON_LOAN' });
      prisma.loan.create.mockResolvedValue(mockLoanWithDevice);

      const result = await repository.create(createDto);

      expect(prisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.deviceId },
        select: { id: true, status: true },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: createDto.deviceId, status: 'AVAILABLE' },
        data: { status: 'ON_LOAN' },
      });
      expect(prisma.loan.create).toHaveBeenCalledWith({
        data: {
          deviceId: createDto.deviceId,
          borrowerName: createDto.borrowerName,
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
      expect(result).toEqual(mockLoanWithDevice);
    });

    it('should throw 404 Not Found when device does not exist', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(repository.create(createDto)).rejects.toThrow('Gerät nicht gefunden');
      await expect(repository.create(createDto)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw 409 Conflict when device not available', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'ON_LOAN' });

      await expect(repository.create(createDto)).rejects.toThrow('Gerät ist bereits ausgeliehen oder nicht verfügbar');
      await expect(repository.create(createDto)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('should throw 409 Conflict when race condition occurs (P2025)', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'AVAILABLE' });
      // Create a mock Prisma error with proper prototype chain
      const prismaError = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
      prismaError.code = 'P2025';
      prismaError.message = 'Record not found';
      prismaError.clientVersion = '5.0.0';
      prisma.$transaction.mockRejectedValue(prismaError);

      await expect(repository.create(createDto)).rejects.toThrow('Gerät wurde soeben ausgeliehen');
      await expect(repository.create(createDto)).rejects.toMatchObject({
        status: 409,
      });
    });

    // Note: P2003 and P2002 handlers removed as they are unreachable with current DB schema
    // P2003 cannot occur because the FK is checked in the atomic update (P2025)
    // P2002 cannot occur because there's no unique constraint on deviceId in loans table

    it('should throw 500 on unknown database error', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'AVAILABLE' });
      prisma.$transaction.mockRejectedValue(new Error('Unknown error'));

      await expect(repository.create(createDto)).rejects.toThrow('Database operation failed');
      await expect(repository.create(createDto)).rejects.toMatchObject({
        status: 500,
      });
    });

    it('should update device status atomically within transaction', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'AVAILABLE' });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.update.mockResolvedValue({ id: createDto.deviceId, status: 'ON_LOAN' });
      prisma.loan.create.mockResolvedValue(mockLoanWithDevice);

      await repository.create(createDto);

      // Verify the device update happens with status check
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: createDto.deviceId, status: 'AVAILABLE' },
        data: { status: 'ON_LOAN' },
      });
    });

    it('should include device info in created loan response', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: createDto.deviceId, status: 'AVAILABLE' });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.update.mockResolvedValue({ id: createDto.deviceId, status: 'ON_LOAN' });
      prisma.loan.create.mockResolvedValue(mockLoanWithDevice);

      const result = await repository.create(createDto);

      expect(result.device).toBeDefined();
      expect(result.device.id).toBe(createDto.deviceId);
      expect(result.device.callSign).toBe('Florian 4/1');
      expect(result.device.status).toBe('ON_LOAN');
    });
  });

  describe('error handling', () => {
    // M2 Fix: Errors are now sanitized to prevent information leakage
    // All Prisma errors are wrapped in HttpException with generic message
    it('should throw sanitized HttpException when Prisma query fails', async () => {
      const prismaError = new Error('Prisma connection failed');
      prisma.loan.findMany.mockRejectedValue(prismaError);

      await expect(repository.findActive()).rejects.toThrow('Database operation failed');
    });

    it('should throw sanitized HttpException when database connection times out', async () => {
      const timeoutError = new Error('Query timeout exceeded');
      prisma.loan.findMany.mockRejectedValue(timeoutError);

      await expect(repository.findActive()).rejects.toThrow('Database operation failed');
    });

    it('should throw sanitized HttpException when foreign key constraint fails', async () => {
      const fkError = new Error('Foreign key constraint violation');
      prisma.loan.findMany.mockRejectedValue(fkError);

      await expect(repository.findActive({ take: 10 })).rejects.toThrow('Database operation failed');
    });

    it('should sanitize Prisma client errors to prevent information leakage', async () => {
      const clientError = new Error('P2025: Record not found');
      prisma.loan.findMany.mockRejectedValue(clientError);

      await expect(repository.findActive()).rejects.toThrow('Database operation failed');
    });

    it('should throw sanitized HttpException for network errors', async () => {
      const networkError = new Error('Network unreachable');
      prisma.loan.findMany.mockRejectedValue(networkError);

      await expect(repository.findActive()).rejects.toThrow('Database operation failed');
    });
  });

  describe('returnLoan', () => {
    const mockLoanId = 'loan12345678901234567890';
    const mockDeviceId = 'device123456789012345678';
    const mockReturnedLoan = {
      id: mockLoanId,
      deviceId: mockDeviceId,
      borrowerName: 'Max Mustermann',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: new Date('2025-12-18T14:00:00Z'),
      returnNote: 'Akku schwach',
      createdAt: new Date('2025-12-16T08:00:00Z'),
      updatedAt: new Date('2025-12-18T14:00:00Z'),
      device: {
        id: mockDeviceId,
        callSign: 'Florian 4-22',
        status: 'AVAILABLE' as const,
      },
    };

    it('should set returnedAt to current timestamp', async () => {
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.updateMany.mockResolvedValue({ count: 1 });
      prisma.loan.update.mockResolvedValue(mockReturnedLoan);

      const result = await repository.returnLoan(mockLoanId, null);

      expect(result.returnedAt).toBeInstanceOf(Date);
      expect(prisma.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockLoanId },
          data: expect.objectContaining({
            returnedAt: expect.any(Date),
            returnNote: null,
          }),
        }),
      );
    });

    it('should save returnNote correctly when provided as string', async () => {
      const returnNote = 'Gerät in gutem Zustand';
      const mockLoanWithNote = {
        ...mockReturnedLoan,
        returnNote,
      };
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.updateMany.mockResolvedValue({ count: 1 });
      prisma.loan.update.mockResolvedValue(mockLoanWithNote);

      const result = await repository.returnLoan(mockLoanId, returnNote);

      expect(result.returnNote).toBe(returnNote);
      expect(prisma.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockLoanId },
          data: expect.objectContaining({
            returnNote,
          }),
        }),
      );
    });

    it('should save returnNote correctly when provided as null', async () => {
      const mockLoanWithoutNote = {
        ...mockReturnedLoan,
        returnNote: null,
      };
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.updateMany.mockResolvedValue({ count: 1 });
      prisma.loan.update.mockResolvedValue(mockLoanWithoutNote);

      const result = await repository.returnLoan(mockLoanId, null);

      expect(result.returnNote).toBeNull();
      expect(prisma.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockLoanId },
          data: expect.objectContaining({
            returnNote: null,
          }),
        }),
      );
    });

    it('should set device status to AVAILABLE', async () => {
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.device.updateMany.mockResolvedValue({ count: 1 });
      prisma.loan.update.mockResolvedValue(mockReturnedLoan);

      const result = await repository.returnLoan(mockLoanId, null);

      expect(prisma.device.updateMany).toHaveBeenCalledWith({
        where: { id: mockDeviceId, status: 'ON_LOAN' },
        data: { status: 'AVAILABLE' },
      });
      expect(result.device.status).toBe('AVAILABLE');
    });

    it('should throw 404 Not Found when loan does not exist', async () => {
      // After H1-Fix: findUnique is now INSIDE transaction, so we mock via $transaction callback
      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.loan.findUnique.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Ausleihe nicht gefunden');
      await expect(repository.returnLoan(mockLoanId, null)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw 409 Conflict when loan is already returned', async () => {
      // After H1-Fix: findUnique is now INSIDE transaction, so we mock via $transaction callback
      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.loan.findUnique.mockResolvedValue({
          id: mockLoanId,
          returnedAt: new Date('2025-12-17T10:00:00Z'),
          deviceId: mockDeviceId,
        });
        return callback(prisma);
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Ausleihe wurde bereits zurückgegeben');
      await expect(repository.returnLoan(mockLoanId, null)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('should rollback transaction when device update fails', async () => {
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      const deviceError = new Error('Device update failed');
      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.device.updateMany.mockRejectedValue(deviceError);
        try {
          await callback(prisma);
        } catch (error) {
          throw error;
        }
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Database operation failed');

      // Verify transaction was called (which means it would rollback on error)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw 409 Conflict when device status already changed (count=0)', async () => {
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.device.updateMany.mockResolvedValue({ count: 0 });
        return callback(prisma);
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Gerätestatus wurde bereits geändert');
      await expect(repository.returnLoan(mockLoanId, null)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('should differentiate between device update failure and loan update failure', async () => {
      // Test case 1: Device status already changed
      prisma.loan.findUnique.mockResolvedValue({
        id: mockLoanId,
        returnedAt: null,
        deviceId: mockDeviceId,
      });
      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.device.updateMany.mockResolvedValue({ count: 0 });
        return callback(prisma);
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Gerätestatus wurde bereits geändert');

      // Test case 2: Loan already returned (P2025 on loan update)
      const prismaError = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
      prismaError.code = 'P2025';
      prismaError.message = 'Record not found';
      prismaError.clientVersion = '5.0.0';

      prisma.$transaction.mockImplementation(async (callback) => {
        prisma.device.updateMany.mockResolvedValue({ count: 1 });
        prisma.loan.update.mockRejectedValue(prismaError);
        return callback(prisma);
      });

      await expect(repository.returnLoan(mockLoanId, null)).rejects.toThrow('Ausleihe wurde soeben von jemand anderem zurückgegeben');
    });
  });
});
