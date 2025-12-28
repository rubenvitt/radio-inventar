import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LOAN_FIELD_LIMITS, getPreTransformMaxLength } from '@radio-inventar/shared';
import { sanitizeString } from '../../../common/utils';

export class ReturnLoanDto {
  @ApiProperty({
    description: 'Optionale Zustandsnotiz bei Rückgabe',
    example: 'Akku schwach',
    maxLength: LOAN_FIELD_LIMITS.RETURN_NOTE_MAX,
    required: false,
  })
  /**
   * L4 R3: @IsOptional allows null values and short-circuits validation for null/undefined.
   * @IsString only validates when the value is present (non-null/non-undefined).
   */
  @IsOptional()
  /**
   * M4 R3: Triple validation is NOT redundant - each serves a distinct purpose:
   *
   * 1. Pre-transform MaxLength (line 16): DOS protection before normalization
   *    - Uses 2x+100 buffer (getPreTransformMaxLength)
   *    - Prevents memory exhaustion from huge strings
   *
   * 2. Inside sanitizeString (line 19): Post-normalization validation
   *    - Unicode normalization can change length (e.g., "é" → "é")
   *    - Ensures normalized string doesn't exceed business limit
   *
   * 3. Post-transform MaxLength (line 25): class-validator validation
   *    - Required for direct DTO instantiation (bypassing Transform)
   *    - Ensures validation even if Transform is skipped
   */
  @MaxLength(getPreTransformMaxLength(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX))
  /**
   * Security: Unicode Normalization and Zero-Width Character Removal
   *
   * This transform protects against:
   * 1. Homograph attacks: Visually similar Unicode characters (e.g., Cyrillic "а" vs Latin "a")
   *    - Unicode normalization (NFC) ensures consistent character representation
   * 2. Invisible characters: Zero-width spaces, joiners, non-joiners
   *    - These can be used to bypass filters or create hidden content
   *    - Removal prevents data corruption and ensures display consistency
   *
   * Example attack vectors prevented:
   * - "Tіm" (Cyrillic і) vs "Tim" (Latin i) → normalized to consistent form
   * - "Test​Note" (contains U+200B zero-width space) → cleaned to "TestNote"
   */
  @Transform(({ value }) =>
    sanitizeString(value, {
      maxLength: LOAN_FIELD_LIMITS.RETURN_NOTE_MAX,
      emptyToNull: true,
    }),
  )
  @IsString()
  @MaxLength(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX)
  returnNote?: string | null;
}
