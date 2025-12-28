import { IsString, IsNotEmpty, MaxLength, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LOAN_FIELD_LIMITS, getPreTransformMaxLength } from '@radio-inventar/shared';
import { sanitizeString } from '../../../common/utils';

export class CreateLoanDto {
  @ApiProperty({
    description: 'Device ID (CUID2)',
    example: 'cm6kqmc1100001hm1csttvdz',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]{24,32}$/, { message: 'deviceId must be a valid CUID2' })
  deviceId!: string;

  @ApiProperty({
    description: 'Name des Ausleihers',
    example: 'Max Mustermann',
    maxLength: LOAN_FIELD_LIMITS.BORROWER_NAME_MAX,
  })
  // DOS protection: Pre-transform length check with buffer
  @MaxLength(getPreTransformMaxLength(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX))
  @Transform(({ value }) =>
    sanitizeString(value, {
      maxLength: LOAN_FIELD_LIMITS.BORROWER_NAME_MAX,
    }),
  )
  @IsString()
  @MinLength(1)
  // Post-transform business validation
  @MaxLength(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX)
  borrowerName!: string;
}
