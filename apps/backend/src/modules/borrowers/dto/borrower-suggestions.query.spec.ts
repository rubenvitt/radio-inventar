import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BorrowerSuggestionsQueryDto } from './borrower-suggestions.query';

describe('BorrowerSuggestionsQueryDto Validation', () => {
  describe('q (search query)', () => {
    it('should accept valid search query with 2 characters', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'ab';

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors).toHaveLength(0);
    });

    it('should accept search query with umlauts and special characters', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'Müller-Schäfer';

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors).toHaveLength(0);
    });

    it('should accept search query at max length (100 characters)', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'a'.repeat(100);

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors).toHaveLength(0);
    });

    it('should reject search query shorter than 2 characters', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'a';

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors.length).toBeGreaterThan(0);
      expect(qErrors[0].constraints).toHaveProperty('minLength');
    });

    it('should reject search query exceeding max length (101 characters)', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'a'.repeat(101);

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors.length).toBeGreaterThan(0);
      expect(qErrors[0].constraints).toHaveProperty('maxLength');
    });

    it('should reject empty search query', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = '';

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors.length).toBeGreaterThan(0);
      expect(qErrors[0].constraints).toHaveProperty('minLength');
    });

    it('should reject non-string search query', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      (dto as any).q = 12345;

      const errors = await validate(dto);
      const qErrors = errors.filter((e) => e.property === 'q');

      expect(qErrors.length).toBeGreaterThan(0);
      expect(qErrors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('limit (optional)', () => {
    it('should accept valid limit value (10)', async () => {
      const plain = { q: 'test', limit: '10' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors).toHaveLength(0);
      expect(dto.limit).toBe(10);
    });

    it('should accept limit at minimum (1)', async () => {
      const plain = { q: 'test', limit: '1' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors).toHaveLength(0);
      expect(dto.limit).toBe(1);
    });

    it('should accept limit at maximum (50)', async () => {
      const plain = { q: 'test', limit: '50' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors).toHaveLength(0);
      expect(dto.limit).toBe(50);
    });

    it('should reject limit below minimum (0)', async () => {
      const plain = { q: 'test', limit: '0' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors.length).toBeGreaterThan(0);
      expect(limitErrors[0].constraints).toHaveProperty('min');
    });

    it('should reject limit exceeding maximum (51)', async () => {
      const plain = { q: 'test', limit: '51' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors.length).toBeGreaterThan(0);
      expect(limitErrors[0].constraints).toHaveProperty('max');
    });

    it('should reject non-integer limit (10.5)', async () => {
      const plain = { q: 'test', limit: '10.5' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors.length).toBeGreaterThan(0);
      expect(limitErrors[0].constraints).toHaveProperty('isInt');
    });

    it('should use default value (10) when limit is not provided', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'test';

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors).toHaveLength(0);
      expect(dto.limit).toBe(10);
    });

    it('should transform string to number', async () => {
      const plain = { q: 'test', limit: '25' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');

      expect(limitErrors).toHaveLength(0);
      expect(dto.limit).toBe(25);
      expect(typeof dto.limit).toBe('number');
    });
  });

  describe('multiple fields validation', () => {
    it('should accept fully valid DTO with limit', async () => {
      const plain = { q: 'test', limit: '20' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept fully valid DTO without limit (using default)', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      dto.q = 'test';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(10);
    });

    it('should reject DTO with invalid q and valid limit', async () => {
      const plain = { q: 'a', limit: '10' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'q')).toBe(true);
    });

    it('should reject DTO with valid q and invalid limit', async () => {
      const plain = { q: 'test', limit: '100' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('should reject DTO with missing q', async () => {
      const dto = new BorrowerSuggestionsQueryDto();
      // q is not set

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'q')).toBe(true);
    });
  });

  describe('@Transform(trim) behavior', () => {
    it('should trim leading whitespace from q', async () => {
      const plain = { q: '  Tim' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);
      expect(dto.q).toBe('Tim');
    });

    it('should trim trailing whitespace from q', async () => {
      const plain = { q: 'Tim  ' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);
      expect(dto.q).toBe('Tim');
    });

    it('should trim both leading and trailing whitespace', async () => {
      const plain = { q: '  Tim  ' };
      const dto = plainToInstance(BorrowerSuggestionsQueryDto, plain);
      expect(dto.q).toBe('Tim');
    });
  });
});
