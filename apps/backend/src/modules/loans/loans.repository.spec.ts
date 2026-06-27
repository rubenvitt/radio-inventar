import { Test, TestingModule } from '@nestjs/testing';
import { LoansRepository } from './loans.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';
import { Prisma } from '@prisma/client';

describe('LoansRepository', () => {
  let repository: LoansRepository;
  let prisma: {
    loan: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let radioAdmin: { getDeviceById: jest.Mock };

  const mockDate = new Date('2025-12-16T10:00:00Z');

  const raDevice = {
    id: 'clz123456789012345678901',
    issi: '1001',
    opta: null,
    rufname: 'Florian 4/1',
    status: 'Einsatzbereit',
    location: null,
    deviceType: 'HRT',
    serialNumber: 'SN-1',
    hersteller: null,
    bedieneinheit: null,
    funktion: null,
  };

  beforeEach(async () => {
    prisma = {
      loan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };
    radioAdmin = { getDeviceById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: RadioAdminService, useValue: radioAdmin },
      ],
    }).compile();

    repository = module.get<LoansRepository>(LoansRepository);
  });

  describe('findActive', () => {
    const activeRow = {
      id: 'loan1abcdefghijklmnopqrs',
      deviceId: 'device1abcdefghijklmnopq',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      snapshotCallSign: 'Florian 4-22',
    };

    it('rebuilds the device sub-object from the loan snapshot, status ON_LOAN', async () => {
      prisma.loan.findMany.mockResolvedValue([activeRow]);

      const result = await repository.findActive();

      expect(result).toEqual([
        {
          id: activeRow.id,
          deviceId: activeRow.deviceId,
          borrowerName: activeRow.borrowerName,
          borrowedAt: activeRow.borrowedAt,
          device: { id: activeRow.deviceId, callSign: 'Florian 4-22', status: 'ON_LOAN' },
        },
      ]);
      const call = prisma.loan.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ returnedAt: null });
      expect(call.select.snapshotCallSign).toBe(true);
      expect(call.orderBy).toEqual({ borrowedAt: 'desc' });
    });

    it('caps take at MAX_PAGE_SIZE (500)', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      await repository.findActive({ take: 1000 });
      expect(prisma.loan.findMany.mock.calls[0][0].take).toBe(500);
    });

    it('sanitizes db errors', async () => {
      prisma.loan.findMany.mockRejectedValue(new Error('Prisma connection failed'));
      await expect(repository.findActive()).rejects.toThrow('Database operation failed');
    });
  });

  describe('create', () => {
    const createDto = { deviceId: 'clz123456789012345678901', borrowerName: 'Max Mustermann' };

    it('writes a device snapshot and returns the device sub-object (ON_LOAN)', async () => {
      radioAdmin.getDeviceById.mockResolvedValue(raDevice);
      prisma.loan.create.mockResolvedValue({
        id: 'loan12345678901234567890',
        deviceId: createDto.deviceId,
        borrowerName: createDto.borrowerName,
        borrowedAt: mockDate,
      });

      const result = await repository.create(createDto);

      expect(radioAdmin.getDeviceById).toHaveBeenCalledWith(createDto.deviceId);
      expect(prisma.loan.create.mock.calls[0][0].data).toMatchObject({
        deviceId: createDto.deviceId,
        borrowerName: createDto.borrowerName,
        snapshotCallSign: 'Florian 4/1',
        snapshotSerialNumber: 'SN-1',
        snapshotDeviceType: 'HRT',
      });
      expect(result.device).toEqual({
        id: createDto.deviceId,
        callSign: 'Florian 4/1',
        status: 'ON_LOAN',
      });
    });

    it('falls back to issi for the snapshot call sign when rufname is null', async () => {
      radioAdmin.getDeviceById.mockResolvedValue({ ...raDevice, rufname: null });
      prisma.loan.create.mockResolvedValue({
        id: 'loan12345678901234567890',
        deviceId: createDto.deviceId,
        borrowerName: createDto.borrowerName,
        borrowedAt: mockDate,
      });

      const result = await repository.create(createDto);
      expect(prisma.loan.create.mock.calls[0][0].data.snapshotCallSign).toBe('1001');
      expect(result.device.callSign).toBe('1001');
    });

    it('throws 404 when the device is not a loanable radio-admin device', async () => {
      radioAdmin.getDeviceById.mockResolvedValue(null);
      await expect(repository.create(createDto)).rejects.toMatchObject({ status: 404 });
    });

    it('throws 409 when radio-admin reports the device defect or in maintenance', async () => {
      radioAdmin.getDeviceById.mockResolvedValue({ ...raDevice, status: 'Defekt' });
      await expect(repository.create(createDto)).rejects.toMatchObject({ status: 409 });
      expect(prisma.loan.create).not.toHaveBeenCalled();
    });

    it('throws 409 when the device already has an active loan (partial unique index, P2002)', async () => {
      radioAdmin.getDeviceById.mockResolvedValue(raDevice);
      const err = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
      err.code = 'P2002';
      prisma.loan.create.mockRejectedValue(err);
      await expect(repository.create(createDto)).rejects.toMatchObject({ status: 409 });
    });

    it('sanitizes unknown db errors to 500', async () => {
      radioAdmin.getDeviceById.mockResolvedValue(raDevice);
      prisma.loan.create.mockRejectedValue(new Error('boom'));
      await expect(repository.create(createDto)).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('returnLoan', () => {
    const loanId = 'loan12345678901234567890';
    const deviceId = 'device123456789012345678';

    function mockReturned(returnNote: string | null) {
      prisma.loan.updateMany.mockResolvedValue({ count: 1 });
      prisma.loan.findUnique.mockResolvedValue({
        id: loanId,
        deviceId,
        borrowerName: 'Max Mustermann',
        borrowedAt: new Date('2025-12-16T08:00:00Z'),
        returnedAt: new Date('2025-12-18T14:00:00Z'),
        returnNote,
        snapshotCallSign: 'Florian 4-22',
      });
    }

    it('closes the open loan atomically and returns device status AVAILABLE', async () => {
      mockReturned(null);
      const result = await repository.returnLoan(loanId, null);

      const call = prisma.loan.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: loanId, returnedAt: null });
      expect(call.data.returnedAt).toBeInstanceOf(Date);
      expect(result.returnedAt).toBeInstanceOf(Date);
      expect(result.device).toEqual({ id: deviceId, callSign: 'Florian 4-22', status: 'AVAILABLE' });
    });

    it('persists the return note', async () => {
      mockReturned('Akku schwach');
      const result = await repository.returnLoan(loanId, 'Akku schwach');
      expect(prisma.loan.updateMany.mock.calls[0][0].data.returnNote).toBe('Akku schwach');
      expect(result.returnNote).toBe('Akku schwach');
    });

    it('throws 409 when the loan was already returned', async () => {
      prisma.loan.updateMany.mockResolvedValue({ count: 0 });
      prisma.loan.findUnique.mockResolvedValue({ id: loanId });
      await expect(repository.returnLoan(loanId, null)).rejects.toMatchObject({ status: 409 });
    });

    it('throws 404 when the loan does not exist', async () => {
      prisma.loan.updateMany.mockResolvedValue({ count: 0 });
      prisma.loan.findUnique.mockResolvedValue(null);
      await expect(repository.returnLoan(loanId, null)).rejects.toMatchObject({ status: 404 });
    });

    it('sanitizes unknown db errors to 500', async () => {
      prisma.loan.updateMany.mockRejectedValue(new Error('boom'));
      await expect(repository.returnLoan(loanId, null)).rejects.toMatchObject({ status: 500 });
    });
  });
});
