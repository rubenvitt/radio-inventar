import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { ParseCuid2Pipe } from '../../common/pipes';

describe('LoansController', () => {
  let controller: LoansController;
  let service: jest.Mocked<LoansService>;

  const mockActiveLoans = [
    {
      id: 'loan1',
      deviceId: 'device1',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: null,
      returnNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      device: {
        id: 'device1',
        callSign: 'Florian 4-22',
        status: 'ON_LOAN',
      },
    },
  ];

  beforeEach(async () => {
    const mockService = {
      findActive: jest.fn(),
      create: jest.fn(),
      returnLoan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        { provide: LoansService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<LoansController>(LoansController);
    service = module.get(LoansService);
  });

  describe('findActive', () => {
    it('should return array of active loans', async () => {
      service.findActive.mockResolvedValue(mockActiveLoans);

      const result = await controller.findActive({ take: undefined, skip: undefined });

      expect(result).toEqual(mockActiveLoans);
      expect(service.findActive).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return empty array when no active loans', async () => {
      service.findActive.mockResolvedValue([]);

      const result = await controller.findActive({ take: undefined, skip: undefined });

      expect(result).toEqual([]);
    });

    it('should include device information in response', async () => {
      service.findActive.mockResolvedValue(mockActiveLoans);

      const result = await controller.findActive({ take: undefined, skip: undefined });

      expect(result[0].device).toEqual({
        id: 'device1',
        callSign: 'Florian 4-22',
        status: 'ON_LOAN',
      });
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      service.findActive.mockRejectedValue(error);

      await expect(controller.findActive({ take: undefined, skip: undefined })).rejects.toThrow('Service error');
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

    it('should create loan and return loan data', async () => {
      service.create.mockResolvedValue(mockCreatedLoan);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedLoan);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should include device info in response', async () => {
      service.create.mockResolvedValue(mockCreatedLoan);

      const result = await controller.create(createDto);

      expect(result.device).toEqual(expect.objectContaining({
        id: expect.any(String),
        callSign: expect.any(String),
        status: 'ON_LOAN',
      }));
    });

    // Tests verify that controller propagates service errors unchanged
    // Error formatting is handled by NestJS exception filter, not controller
    it('should propagate not found error from service', async () => {
      const error = { status: 404, message: 'Gerät nicht gefunden' };
      service.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate conflict error when device not available', async () => {
      const error = { status: 409, message: 'Gerät ist bereits ausgeliehen oder nicht verfügbar' };
      service.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate conflict error on race condition', async () => {
      const error = { status: 409, message: 'Gerät wurde soeben ausgeliehen' };
      service.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toMatchObject(error);
    });

    it('should propagate internal server error from service', async () => {
      const error = { status: 500, message: 'Database operation failed' };
      service.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toMatchObject(error);
    });

    it('should pass DTO to service without modification', async () => {
      service.create.mockResolvedValue(mockCreatedLoan);

      await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create.mock.calls[0][0]).toBe(createDto);
    });

    it('should handle valid CUID2 deviceId', async () => {
      const validDto = {
        deviceId: 'cm6kqmc1100001hm1csttvdz',
        borrowerName: 'Tim Schäfer',
      };
      const validLoan = { ...mockCreatedLoan, deviceId: validDto.deviceId, borrowerName: validDto.borrowerName };
      service.create.mockResolvedValue(validLoan);

      const result = await controller.create(validDto);

      expect(result.deviceId).toBe(validDto.deviceId);
      expect(service.create).toHaveBeenCalledWith(validDto);
    });

    it('should handle German characters in borrowerName', async () => {
      const germanDto = {
        deviceId: 'clz123456789012345678901',
        borrowerName: 'Jürgen Müller-Schäfer',
      };
      const germanLoan = { ...mockCreatedLoan, borrowerName: germanDto.borrowerName };
      service.create.mockResolvedValue(germanLoan);

      const result = await controller.create(germanDto);

      expect(result.borrowerName).toBe('Jürgen Müller-Schäfer');
      expect(service.create).toHaveBeenCalledWith(germanDto);
    });

    // Note: Rate-limiting behavior (10 requests/min production, 100 in test)
    // is enforced by NestJS ThrottlerGuard at the framework level.
    // Testing this requires integration tests with the full NestJS app context.
    // Unit tests verify controller behavior, not framework-level rate limiting.
  });

  describe('returnLoan', () => {
    const mockLoanId = 'cm6kqmc1200001hm1abcd123';
    const mockReturnedLoan = {
      id: mockLoanId,
      deviceId: 'cm6kqmc1100001hm1csttvdz',
      borrowerName: 'Tim Schäfer',
      borrowedAt: new Date('2025-12-16T08:00:00Z'),
      returnedAt: new Date('2025-12-18T14:00:00Z'),
      returnNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      device: {
        id: 'cm6kqmc1100001hm1csttvdz',
        callSign: 'Florian 4-22',
        status: 'AVAILABLE',
      },
    };

    it('should return loan with empty dto body', async () => {
      service.returnLoan.mockResolvedValue(mockReturnedLoan);

      const result = await controller.returnLoan(mockLoanId, {});

      expect(result).toEqual(mockReturnedLoan);
      expect(result.returnedAt).toEqual(mockReturnedLoan.returnedAt);
      expect(service.returnLoan).toHaveBeenCalledWith(mockLoanId, {});
    });

    it('should return loan with returnNote', async () => {
      const returnedWithNote = { ...mockReturnedLoan, returnNote: 'Akku schwach' };
      service.returnLoan.mockResolvedValue(returnedWithNote);

      const result = await controller.returnLoan(mockLoanId, { returnNote: 'Akku schwach' });

      expect(result.returnNote).toBe('Akku schwach');
      expect(service.returnLoan).toHaveBeenCalledWith(mockLoanId, { returnNote: 'Akku schwach' });
    });

    it('should include device information in response', async () => {
      service.returnLoan.mockResolvedValue(mockReturnedLoan);

      const result = await controller.returnLoan(mockLoanId, {});

      expect(result.device).toEqual({
        id: 'cm6kqmc1100001hm1csttvdz',
        callSign: 'Florian 4-22',
        status: 'AVAILABLE',
      });
    });

    // M2 R4 - Device Status Assertion: Verify controller returns dynamic service response
    it('should return device status from service without hardcoded value', async () => {
      const onLoanResponse = {
        ...mockReturnedLoan,
        device: { ...mockReturnedLoan.device, status: 'ON_LOAN' as const },
      };
      service.returnLoan.mockResolvedValue(onLoanResponse);

      const result = await controller.returnLoan(mockLoanId, {});

      expect(result.device.status).toBe('ON_LOAN');
      expect(result.device.status).toBe(onLoanResponse.device.status);
    });

    it('should propagate not found error from service', async () => {
      const error = { status: 404, message: 'Ausleihe nicht gefunden' };
      service.returnLoan.mockRejectedValue(error);

      await expect(controller.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    it('should propagate conflict error from service', async () => {
      const error = { status: 409, message: 'Ausleihe wurde bereits zurückgegeben' };
      service.returnLoan.mockRejectedValue(error);

      await expect(controller.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    it('should propagate internal server error from service', async () => {
      const error = { status: 500, message: 'Database operation failed' };
      service.returnLoan.mockRejectedValue(error);

      await expect(controller.returnLoan(mockLoanId, {})).rejects.toMatchObject(error);
    });

    // H2 R4 & M5 R3 - Controller Validation Tests for returnLoan
    describe('validation errors', () => {
      let parseCuid2Pipe: ParseCuid2Pipe;

      beforeEach(() => {
        parseCuid2Pipe = new ParseCuid2Pipe();
      });

      // ParseCuid2Pipe validation tests
      it('should reject invalid loanId format (non-CUID2)', async () => {
        const invalidLoanId = 'abc123';

        expect(() => parseCuid2Pipe.transform(invalidLoanId)).toThrow('Ungültiges ID-Format');
      });

      it('should reject loanId with uppercase letters', async () => {
        const invalidLoanId = 'CM6KQMC1200001HM1ABCD123';

        expect(() => parseCuid2Pipe.transform(invalidLoanId)).toThrow('Ungültiges ID-Format');
      });

      it('should reject loanId shorter than 24 characters', async () => {
        const invalidLoanId = 'cm6kqmc12'; // Too short

        expect(() => parseCuid2Pipe.transform(invalidLoanId)).toThrow('Ungültiges ID-Format');
      });

      it('should reject loanId longer than 32 characters', async () => {
        const invalidLoanId = 'cm6kqmc1200001hm1abcd12345678901234567'; // Too long

        expect(() => parseCuid2Pipe.transform(invalidLoanId)).toThrow('Ungültiges ID-Format');
      });

      it('should reject loanId with special characters', async () => {
        const invalidLoanId = 'cm6kqmc1200001hm1abcd-123';

        expect(() => parseCuid2Pipe.transform(invalidLoanId)).toThrow('Ungültiges ID-Format');
      });

      // ReturnLoanDto validation tests
      // Note: These tests verify the DTO validation logic. In a real NestJS app,
      // ValidationPipe would enforce these rules at runtime before controller method execution.
      it('should reject returnNote exceeding 500 characters', async () => {
        const longNote = 'x'.repeat(501);
        const dto = { returnNote: longNote };

        // In a real app, ValidationPipe rejects this before controller method runs
        // The sanitizeString function throws BadRequestException during transformation
        const { plainToInstance } = await import('class-transformer');
        const { ReturnLoanDto } = await import('./dto/return-loan.dto');

        // Error message is in German per project configuration
        expect(() => plainToInstance(ReturnLoanDto, dto)).toThrow(
          'Zeichenkette überschreitet maximale Länge nach Normalisierung',
        );
      });

      it('should convert non-string returnNote to null (type safety)', async () => {
        const dto = { returnNote: 123 as any };

        // sanitizeString returns null for non-string values (type safety)
        // This prevents type confusion attacks
        const { validate } = await import('class-validator');
        const { plainToInstance } = await import('class-transformer');
        const { ReturnLoanDto } = await import('./dto/return-loan.dto');

        const dtoInstance = plainToInstance(ReturnLoanDto, dto);
        const errors = await validate(dtoInstance);

        // Non-string values are converted to null by sanitizeString
        // This is secure behavior - invalid types become null instead of being coerced
        expect(errors.length).toBe(0);
        expect(dtoInstance.returnNote).toBeNull();
      });

      it('should accept returnNote at exactly 500 characters', async () => {
        const maxLengthNote = 'x'.repeat(500);
        const returnedWithMaxNote = { ...mockReturnedLoan, returnNote: maxLengthNote };
        service.returnLoan.mockResolvedValue(returnedWithMaxNote);

        const result = await controller.returnLoan(mockLoanId, { returnNote: maxLengthNote });

        expect(result.returnNote).toBe(maxLengthNote);
      });
    });

    // L4 R3 - Empty Body Test: Test truly empty body (undefined)
    it('should handle undefined body', async () => {
      service.returnLoan.mockResolvedValue(mockReturnedLoan);

      const result = await controller.returnLoan(mockLoanId, undefined as any);

      expect(result).toEqual(mockReturnedLoan);
      expect(service.returnLoan).toHaveBeenCalledWith(mockLoanId, undefined);
    });
  });
});
