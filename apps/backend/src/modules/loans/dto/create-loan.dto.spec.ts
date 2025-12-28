import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLoanDto } from './create-loan.dto';

describe('CreateLoanDto Validation', () => {
  describe('deviceId', () => {
    it('should accept valid CUID2', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors).toHaveLength(0);
    });

    it('should accept CUID2 with 24+ characters', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'clz123456789012345678901'; // 24 chars
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors).toHaveLength(0);
    });

    it('should reject empty deviceId', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = '';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject deviceId with uppercase letters', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'CLZ123456789012345678901';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('matches');
    });

    it('should reject deviceId with special characters', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'clz12345678901234567890!';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('matches');
    });

    it('should reject deviceId shorter than 24 characters', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'clz12345'; // too short
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('matches');
    });

    it('should reject deviceId with spaces', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'clz1234567890 12345678901';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('matches');
    });

    it('should reject non-string deviceId', async () => {
      const dto = new CreateLoanDto();
      (dto as any).deviceId = 123456; // number instead of string
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const deviceIdErrors = errors.filter((e) => e.property === 'deviceId');

      expect(deviceIdErrors.length).toBeGreaterThan(0);
      expect(deviceIdErrors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('borrowerName', () => {
    it('should accept valid borrower name', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors).toHaveLength(0);
    });

    it('should accept German characters (umlauts)', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = 'Jürgen Müller-Schäfer';

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors).toHaveLength(0);
    });

    it('should accept single word name', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = 'Max';

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors).toHaveLength(0);
    });

    it('should reject empty borrowerName', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = '';

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors.length).toBeGreaterThan(0);
      expect(borrowerNameErrors[0].constraints).toHaveProperty('minLength');
    });

    it('should reject non-string borrowerName', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      (dto as any).borrowerName = 12345;

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors.length).toBeGreaterThan(0);
      expect(borrowerNameErrors[0].constraints).toHaveProperty('isString');
    });

    it('should reject borrowerName exceeding max length', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      // LOAN_FIELD_LIMITS.BORROWER_NAME_MAX is 100
      dto.borrowerName = 'a'.repeat(101);

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors.length).toBeGreaterThan(0);
      expect(borrowerNameErrors[0].constraints).toHaveProperty('maxLength');
    });

    it('should accept borrowerName at max length', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      // Max length is 100
      dto.borrowerName = 'a'.repeat(100);

      const errors = await validate(dto);
      const borrowerNameErrors = errors.filter((e) => e.property === 'borrowerName');

      expect(borrowerNameErrors).toHaveLength(0);
    });
  });

  describe('multiple fields validation', () => {
    it('should reject DTO with all empty fields', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = '';
      dto.borrowerName = '';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'deviceId')).toBe(true);
      expect(errors.some((e) => e.property === 'borrowerName')).toBe(true);
    });

    it('should reject DTO with missing fields', async () => {
      const dto = new CreateLoanDto();
      // No fields set

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept fully valid DTO', async () => {
      const dto = new CreateLoanDto();
      dto.deviceId = 'cm6kqmc1100001hm1csttvdz';
      dto.borrowerName = 'Max Mustermann';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('@Transform(trim) behavior', () => {
    it('should trim leading whitespace from borrowerName', async () => {
      const plain = { deviceId: 'cm6kqmc1100001hm1csttvdz', borrowerName: '  Max Mustermann' };
      const dto = plainToInstance(CreateLoanDto, plain);
      expect(dto.borrowerName).toBe('Max Mustermann');
    });

    it('should trim trailing whitespace from borrowerName', async () => {
      const plain = { deviceId: 'cm6kqmc1100001hm1csttvdz', borrowerName: 'Max Mustermann  ' };
      const dto = plainToInstance(CreateLoanDto, plain);
      expect(dto.borrowerName).toBe('Max Mustermann');
    });

    it('should trim both leading and trailing whitespace', async () => {
      const plain = { deviceId: 'cm6kqmc1100001hm1csttvdz', borrowerName: '  Max Mustermann  ' };
      const dto = plainToInstance(CreateLoanDto, plain);
      expect(dto.borrowerName).toBe('Max Mustermann');
    });

    it('should not trim internal whitespace', async () => {
      const plain = { deviceId: 'cm6kqmc1100001hm1csttvdz', borrowerName: 'Max  Mustermann' };
      const dto = plainToInstance(CreateLoanDto, plain);
      expect(dto.borrowerName).toBe('Max  Mustermann');
    });
  });
});
