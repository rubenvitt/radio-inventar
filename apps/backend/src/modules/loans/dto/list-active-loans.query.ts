import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { PAGINATION } from '@radio-inventar/shared';

export class ListActiveLoansQueryDto {
  @ApiPropertyOptional({
    description: `Anzahl der Einträge (max ${PAGINATION.MAX_PAGE_SIZE})`,
    default: PAGINATION.DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: PAGINATION.MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_PAGE_SIZE)
  take?: number = PAGINATION.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Anzahl der zu überspringenden Einträge',
    default: 0,
    minimum: 0,
    maximum: PAGINATION.MAX_SKIP,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(PAGINATION.MAX_SKIP)  // Prevent DoS via extreme pagination
  skip?: number = 0;
}
