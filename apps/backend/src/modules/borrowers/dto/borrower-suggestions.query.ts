import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BORROWER_FIELD_LIMITS, BORROWER_SUGGESTIONS } from '@radio-inventar/shared';

export class BorrowerSuggestionsQueryDto {
  @ApiProperty({
    description: `Suchbegriff (min ${BORROWER_SUGGESTIONS.MIN_QUERY_LENGTH} Zeichen)`,
    minLength: BORROWER_SUGGESTIONS.MIN_QUERY_LENGTH,
    maxLength: BORROWER_FIELD_LIMITS.NAME_MAX
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(BORROWER_SUGGESTIONS.MIN_QUERY_LENGTH)
  @MaxLength(BORROWER_FIELD_LIMITS.NAME_MAX)
  q!: string;

  @ApiPropertyOptional({
    description: `Max Ergebnisse (default ${BORROWER_SUGGESTIONS.DEFAULT_LIMIT}, max ${BORROWER_SUGGESTIONS.MAX_LIMIT})`,
    default: BORROWER_SUGGESTIONS.DEFAULT_LIMIT
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BORROWER_SUGGESTIONS.MAX_LIMIT)
  limit?: number = BORROWER_SUGGESTIONS.DEFAULT_LIMIT;
}
