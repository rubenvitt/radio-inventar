import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ADMIN_FIELD_LIMITS, getPreTransformMaxLength } from '@radio-inventar/shared';
import { sanitizeString } from '../../../../common/utils';

export class LoginDto {
  @ApiProperty({ description: 'Benutzername', example: 'admin' })
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX))
  // Review #2: lowercase to prevent case-based enumeration (Admin vs admin)
  @Transform(({ value }) => sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.USERNAME_MAX, lowercase: true }))
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.USERNAME_MIN)
  @MaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX)
  username!: string;

  @ApiProperty({ description: 'Passwort' })
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX))
  @Transform(({ value }) => sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.PASSWORD_MAX }))
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.PASSWORD_MIN)
  @MaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX)
  password!: string;
}
