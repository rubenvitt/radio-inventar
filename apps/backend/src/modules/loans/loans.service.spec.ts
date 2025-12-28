import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { LoansRepository } from './loans.repository';

describe('LoansService', () => {
  let service: LoansService;
  let repository: jest.Mocked<LoansRepository>;

  const mockActiveLoans = [
    {
      id: 'loan1abcdefghijklmnopqrs',
      deviceId: 'device1abcdefghijklmnopq',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: null,
      returnNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      device: {
        id: 'device1abcdefghijklmnopq',
        callSign: 'Florian 4-22',
        status: 'ON_LOAN' as const,
      },
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      findActive: jest.fn(),
      create: jest.fn(),
      returnLoan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: LoansRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    repository = module.get(LoansRepository);
  });

  describe('findActive', () => {
    it('should delegate to repository', async () => {
      repository.findActive.mockResolvedValue(mockActiveLoans);

      const result = await service.findActive();

      expect(result).toEqual(mockActiveLoans);
      expect(repository.findActive).toHaveBeenCalled();
      expect(repository.findActive).toHaveBeenCalledTimes(1);
    });

    it('should return loans with device info', async () => {
      repository.findActive.mockResolvedValue(mockActiveLoans);

      const result = await service.findActive();

      expect(result[0].device).toEqual({
        id: 'device1abcdefghijklmnopq',
        callSign: 'Florian 4-22',
        status: 'ON_LOAN',
      });
      expect(result[0].device.id).toBe('device1abcdefghijklmnopq');
      expect(result[0].device.callSign).toBe('Florian 4-22');
      expect(result[0].device.status).toBe('ON_LOAN');
    });

    it('should return empty array when no active loans', async () => {
      repository.findActive.mockResolvedValue([]);

      const result = await service.findActive();

      expect(result).toEqual([]);
    });

    describe('pagination edge cases', () => {
      it('should use default take when undefined', async () => {
        repository.findActive.mockResolvedValue(mockActiveLoans);

        await service.findActive(undefined, 0);

        // When take is undefined, it should not be passed to repository (repository uses its default)
        expect(repository.findActive).toHaveBeenCalledWith({ skip: 0 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });

      it('should handle take=0 gracefully', async () => {
        repository.findActive.mockResolvedValue([]);

        const result = await service.findActive(0, 0);

        // Service should pass take=0 to repository
        expect(repository.findActive).toHaveBeenCalledWith({ take: 0, skip: 0 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
      });

      it('should handle skip-only (no take)', async () => {
        repository.findActive.mockResolvedValue(mockActiveLoans);

        await service.findActive(undefined, 10);

        // When take is undefined, only skip should be passed
        expect(repository.findActive).toHaveBeenCalledWith({ skip: 10 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });

      it('should pass both take and skip when provided', async () => {
        repository.findActive.mockResolvedValue(mockActiveLoans);

        await service.findActive(50, 20);

        expect(repository.findActive).toHaveBeenCalledWith({ take: 50, skip: 20 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });

      it('should pass no parameters when both are undefined', async () => {
        repository.findActive.mockResolvedValue(mockActiveLoans);

        await service.findActive(undefined, undefined);

        // When both are undefined, an empty object should be passed
        expect(repository.findActive).toHaveBeenCalledWith({});
        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });

      it('should handle take at boundary value (500)', async () => {
        repository.findActive.mockResolvedValue(mockActiveLoans);

        await service.findActive(500, 0);

        expect(repository.findActive).toHaveBeenCalledWith({ take: 500, skip: 0 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });

      it('should handle large skip values', async () => {
        repository.findActive.mockResolvedValue([]);

        const result = await service.findActive(100, 10000);

        expect(repository.findActive).toHaveBeenCalledWith({ take: 100, skip: 10000 });
        expect(repository.findActive).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
      });
    });
  });

  describe('create', () => {
    const createDto = {
      deviceId: 'clz123456789012345678901',
      borrowerName: 'Max Mustermann',
    };
    const mockCreatedLoan = {
      id: 'loan12345678901234567890',
      deviceId: createDto.deviceId,
      borrowerName: createDto.borrowerName,
      borrowedAt: new Date('2025-12-16T10:30:00Z'),
      returnedAt: null,
      returnNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      device: {
        id: createDto.deviceId,
        callSign: 'Florian 4/1',
        status: 'ON_LOAN' as const,
      },
    };

    it('should delegate to repository', async () => {
      repository.create.mockResolvedValue(mockCreatedLoan);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedLoan);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('should return created loan with device info', async () => {
      repository.create.mockResolvedValue(mockCreatedLoan);

      const result = await service.create(createDto);

      expect(result.id).toBe('loan12345678901234567890');
      expect(result.deviceId).toBe(createDto.deviceId);
      expect(result.borrowerName).toBe(createDto.borrowerName);
      expect(result.device).toEqual({
        id: createDto.deviceId,
        callSign: 'Florian 4/1',
        status: 'ON_LOAN',
      });
      expect(result.device.callSign).toBe('Florian 4/1');
      expect(result.device.status).toBe('ON_LOAN');
    });

    it('should propagate repository errors (404 Not Found)', async () => {
      const error = { status: 404, message: 'Gerät nicht gefunden' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (409 Conflict - not available)', async () => {
      const error = { status: 409, message: 'Gerät ist bereits ausgeliehen oder nicht verfügbar' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (409 Conflict - race condition)', async () => {
      const error = { status: 409, message: 'Gerät wurde soeben ausgeliehen' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (500 Internal Server Error)', async () => {
      const error = { status: 500, message: 'Database operation failed' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toMatchObject(error);
    });

    it('should pass exact DTO to repository without modification', async () => {
      repository.create.mockResolvedValue(mockCreatedLoan);

      await service.create(createDto);

      // Verify the DTO is passed exactly as received
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.create.mock.calls[0][0]).toBe(createDto);
    });
  });

  describe('returnLoan', () => {
    const mockLoanId = 'cm6kqmc1200001hm1abcd123';
    const mockReturnedLoan = {
      id: mockLoanId,
      deviceId: 'device1abcdefghijklmnopq',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: new Date('2025-12-18T14:00:00Z'),
      returnNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      device: {
        id: 'device1abcdefghijklmnopq',
        callSign: 'Florian 4-22',
        status: 'AVAILABLE' as const,
      },
    };

    it('should delegate to repository', async () => {
      repository.returnLoan.mockResolvedValue(mockReturnedLoan);

      const result = await service.returnLoan(mockLoanId, {});

      expect(result).toEqual(mockReturnedLoan);
      expect(repository.returnLoan).toHaveBeenCalledWith(mockLoanId, null);
      expect(repository.returnLoan).toHaveBeenCalledTimes(1);
    });

    it('should return returned loan with device info', async () => {
      repository.returnLoan.mockResolvedValue(mockReturnedLoan);

      const result = await service.returnLoan(mockLoanId, {});

      expect(result.id).toBe(mockLoanId);
      expect(result.deviceId).toBe('device1abcdefghijklmnopq');
      expect(result.borrowerName).toBe('Tim Schäfer');
      expect(result.returnedAt).toEqual(new Date('2025-12-18T14:00:00Z'));
      expect(result.returnNote).toBe(null);
      expect(result.device).toEqual({
        id: 'device1abcdefghijklmnopq',
        callSign: 'Florian 4-22',
        status: 'AVAILABLE',
      });
      expect(result.device.id).toBe('device1abcdefghijklmnopq');
      expect(result.device.callSign).toBe('Florian 4-22');
      expect(result.device.status).toBe('AVAILABLE');
    });

    it('should pass returnNote to repository', async () => {
      const dtoWithNote = { returnNote: 'Gerät funktioniert einwandfrei' };
      repository.returnLoan.mockResolvedValue({
        ...mockReturnedLoan,
        returnNote: dtoWithNote.returnNote,
      });

      const result = await service.returnLoan(mockLoanId, dtoWithNote);

      expect(repository.returnLoan).toHaveBeenCalledWith(mockLoanId, dtoWithNote.returnNote);
      expect(repository.returnLoan).toHaveBeenCalledTimes(1);
      expect(result.returnNote).toBe('Gerät funktioniert einwandfrei');
    });

    it('should pass null for undefined returnNote', async () => {
      repository.returnLoan.mockResolvedValue(mockReturnedLoan);

      await service.returnLoan(mockLoanId, {});

      expect(repository.returnLoan).toHaveBeenCalledWith(mockLoanId, null);
      expect(repository.returnLoan).toHaveBeenCalledTimes(1);
    });

    it('should pass explicit null returnNote to repository', async () => {
      const dtoWithNullNote = { returnNote: null };
      repository.returnLoan.mockResolvedValue(mockReturnedLoan);

      await service.returnLoan(mockLoanId, dtoWithNullNote);

      expect(repository.returnLoan).toHaveBeenCalledWith(mockLoanId, null);
      expect(repository.returnLoan).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string returnNote', async () => {
      const dtoWithEmptyString = { returnNote: '' };
      repository.returnLoan.mockResolvedValue(mockReturnedLoan);

      await service.returnLoan(mockLoanId, dtoWithEmptyString);

      // Empty string should be passed as-is or transformed to null depending on DTO validation
      // The service should pass whatever the DTO provides
      expect(repository.returnLoan).toHaveBeenCalledWith(mockLoanId, '');
      expect(repository.returnLoan).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors (404 Not Found)', async () => {
      const error = { status: 404, message: 'Ausleihe nicht gefunden' };
      repository.returnLoan.mockRejectedValue(error);

      await expect(service.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (409 Conflict - already returned)', async () => {
      const error = { status: 409, message: 'Ausleihe wurde bereits zurückgegeben' };
      repository.returnLoan.mockRejectedValue(error);

      await expect(service.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (409 Conflict - race condition)', async () => {
      const error = { status: 409, message: 'Ausleihe wurde soeben zurückgegeben' };
      repository.returnLoan.mockRejectedValue(error);

      await expect(service.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    it('should propagate repository errors (500 Internal Server Error)', async () => {
      const error = { status: 500, message: 'Database operation failed' };
      repository.returnLoan.mockRejectedValue(error);

      await expect(service.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });
  });
});
