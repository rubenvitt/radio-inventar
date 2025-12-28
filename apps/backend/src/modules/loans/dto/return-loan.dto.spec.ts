import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ReturnLoanDto } from './return-loan.dto';
import { LOAN_FIELD_LIMITS } from '@radio-inventar/shared';

describe('ReturnLoanDto Validation', () => {
  describe('returnNote - valid inputs', () => {
    it('should accept valid returnNote', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'Akku schwach';

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });

    it('should accept returnNote at max length (500 characters)', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'a'.repeat(500);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });

    it('should accept missing returnNote (undefined) as valid', async () => {
      const dto = new ReturnLoanDto();
      // returnNote is not set (undefined)

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });

    it('should accept returnNote with German characters (umlauts)', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'Gerät funktioniert einwandfrei, keine Mängel';

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });

    it('should accept returnNote with special characters', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'Display: OK, Akku: 75%, Mikrofon: ✓';

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });
  });

  describe('returnNote - invalid inputs', () => {
    it('should reject returnNote exceeding max length (501 characters)', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'a'.repeat(501);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors.length).toBeGreaterThan(0);
      expect(returnNoteErrors[0].constraints).toHaveProperty('maxLength');
    });

    it('should reject non-string returnNote', async () => {
      const dto = new ReturnLoanDto();
      (dto as any).returnNote = 12345;

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors.length).toBeGreaterThan(0);
      expect(returnNoteErrors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('@Transform behavior - whitespace handling', () => {
    it('should transform whitespace-only returnNote to null', async () => {
      const plain = { returnNote: '   ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });

    it('should transform empty string to null', async () => {
      const plain = { returnNote: '' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });

    it('should transform tab-only string to null', async () => {
      const plain = { returnNote: '\t\t\t' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });

    it('should transform mixed whitespace (spaces, tabs, newlines) to null', async () => {
      const plain = { returnNote: ' \t\n\r ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });

    it('should trim leading whitespace from returnNote', async () => {
      const plain = { returnNote: '  Akku schwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akku schwach');
    });

    it('should trim trailing whitespace from returnNote', async () => {
      const plain = { returnNote: 'Akku schwach  ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akku schwach');
    });

    it('should trim both leading and trailing whitespace', async () => {
      const plain = { returnNote: '  Akku schwach  ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akku schwach');
    });

    it('should preserve internal whitespace', async () => {
      const plain = { returnNote: 'Akku  schwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akku  schwach');
    });
  });

  describe('@Transform behavior - zero-width characters', () => {
    it('should remove zero-width space (U+200B)', async () => {
      const plain = { returnNote: 'Akku\u200Bschwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akkuschwach');
      expect(dto.returnNote).not.toContain('\u200B');
    });

    it('should remove zero-width non-joiner (U+200C)', async () => {
      const plain = { returnNote: 'Akku\u200Cschwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akkuschwach');
      expect(dto.returnNote).not.toContain('\u200C');
    });

    it('should remove zero-width joiner (U+200D)', async () => {
      const plain = { returnNote: 'Akku\u200Dschwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akkuschwach');
      expect(dto.returnNote).not.toContain('\u200D');
    });

    it('should remove zero-width no-break space / BOM (U+FEFF)', async () => {
      const plain = { returnNote: 'Akku\uFEFFschwach' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akkuschwach');
      expect(dto.returnNote).not.toContain('\uFEFF');
    });

    it('should remove multiple zero-width characters', async () => {
      const plain = { returnNote: '\u200BAkku\u200C \u200Dschwach\uFEFF' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Akku schwach');
      expect(dto.returnNote).not.toContain('\u200B');
      expect(dto.returnNote).not.toContain('\u200C');
      expect(dto.returnNote).not.toContain('\u200D');
      expect(dto.returnNote).not.toContain('\uFEFF');
    });

    it('should transform to null when only zero-width characters remain after sanitization', async () => {
      const plain = { returnNote: '\u200B\u200C\u200D\uFEFF' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });
  });

  describe('@Transform behavior - Unicode normalization', () => {
    it('should normalize composed characters (NFC)', async () => {
      // 'ü' as single character (U+00FC) vs 'u' + combining diaeresis (U+0075 U+0308)
      const plain1 = { returnNote: 'Müller' }; // composed
      const plain2 = { returnNote: 'Mu\u0308ller' }; // decomposed

      const dto1 = plainToInstance(ReturnLoanDto, plain1);
      const dto2 = plainToInstance(ReturnLoanDto, plain2);

      expect(dto1.returnNote).toBe(dto2.returnNote);
      expect(dto1.returnNote).toBe('Müller');
    });

    it('should normalize accented characters', async () => {
      // 'é' as single character (U+00E9) vs 'e' + combining acute (U+0065 U+0301)
      const plain1 = { returnNote: 'café' }; // composed
      const plain2 = { returnNote: 'cafe\u0301' }; // decomposed

      const dto1 = plainToInstance(ReturnLoanDto, plain1);
      const dto2 = plainToInstance(ReturnLoanDto, plain2);

      expect(dto1.returnNote).toBe(dto2.returnNote);
      expect(dto1.returnNote).toBe('café');
    });

    it('should accept various Unicode characters after normalization', async () => {
      const plain = { returnNote: 'Gerät 🔋 funktioniert ✓' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBe('Gerät 🔋 funktioniert ✓');
    });
  });

  describe('@Transform behavior - edge cases', () => {
    it('should handle non-string values (pass through)', async () => {
      const plain = { returnNote: null };
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeNull();
    });

    it('should handle undefined returnNote', async () => {
      const plain = {};
      const dto = plainToInstance(ReturnLoanDto, plain);

      expect(dto.returnNote).toBeUndefined();
    });

    it('should transform complex input with all sanitization steps', async () => {
      // Input: leading/trailing whitespace + zero-width chars + decomposed unicode
      const plain = { returnNote: '  \u200BMu\u0308ller\u200C  ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      // Expected: normalized + sanitized + trimmed
      expect(dto.returnNote).toBe('Müller');
    });
  });

  describe('validation after transformation', () => {
    it('should pass validation for transformed null value from empty string', async () => {
      const plain = { returnNote: '   ' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(dto.returnNote).toBeNull();
      expect(returnNoteErrors).toHaveLength(0);
    });

    it('should throw BadRequestException if length exceeds max after normalization', () => {
      // After trimming, should still be over 500 chars
      const longString = 'a'.repeat(510);
      const plain = { returnNote: `  ${longString}  ` };

      // sanitizeString throws BadRequestException before validation runs
      // Error message is in German per project configuration
      expect(() => {
        plainToInstance(ReturnLoanDto, plain);
      }).toThrow('Zeichenkette überschreitet maximale Länge nach Normalisierung (maximal 500, erhalten 510)');
    });

    it('should accept at boundary (500 chars) after trimming', async () => {
      const maxString = 'a'.repeat(500);
      const plain = { returnNote: `  ${maxString}  ` };
      const dto = plainToInstance(ReturnLoanDto, plain);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(dto.returnNote).toBe(maxString);
      expect(returnNoteErrors).toHaveLength(0);
    });
  });

  describe('full DTO validation', () => {
    it('should accept DTO with valid returnNote', async () => {
      const plain = { returnNote: 'Gerät in gutem Zustand' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with null returnNote', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = null;

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with undefined returnNote', async () => {
      const dto = new ReturnLoanDto();
      // returnNote is not set

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with empty string that transforms to null', async () => {
      const plain = { returnNote: '' };
      const dto = plainToInstance(ReturnLoanDto, plain);

      const errors = await validate(dto);

      expect(dto.returnNote).toBeNull();
      expect(errors).toHaveLength(0);
    });
  });

  describe('LOAN_FIELD_LIMITS constant', () => {
    it('should use correct RETURN_NOTE_MAX value (500)', () => {
      expect(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX).toBe(500);
    });

    it('should reject returnNote exceeding LOAN_FIELD_LIMITS.RETURN_NOTE_MAX', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'a'.repeat(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX + 1);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors.length).toBeGreaterThan(0);
      expect(returnNoteErrors[0].constraints).toHaveProperty('maxLength');
    });

    it('should accept returnNote at exactly LOAN_FIELD_LIMITS.RETURN_NOTE_MAX', async () => {
      const dto = new ReturnLoanDto();
      dto.returnNote = 'a'.repeat(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX);

      const errors = await validate(dto);
      const returnNoteErrors = errors.filter((e) => e.property === 'returnNote');

      expect(returnNoteErrors).toHaveLength(0);
    });
  });
});
