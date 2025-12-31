import { IsString, MinLength, MaxLength, IsOptional, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADMIN_FIELD_LIMITS, getPreTransformMaxLength } from '@radio-inventar/shared';
import { sanitizeString } from '../../../../common/utils';

export class ChangeCredentialsDto {
  @ApiProperty({ description: 'Aktuelles Passwort zur Verifizierung' })
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX))
  @Transform(({ value }) => sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.PASSWORD_MAX }))
  @IsString()
  @MinLength(1, { message: 'Aktuelles Passwort ist erforderlich' })
  currentPassword!: string;

  @ApiPropertyOptional({ description: 'Neuer Benutzername' })
  @IsOptional()
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX))
  @Transform(({ value }) => value ? sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.USERNAME_MAX, lowercase: true }) : undefined)
  @ValidateIf((o) => o.newUsername !== undefined && o.newUsername !== '')
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.USERNAME_MIN, { message: `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben` })
  @MaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX, { message: `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben` })
  newUsername?: string;

  @ApiPropertyOptional({ description: 'Neues Passwort' })
  @IsOptional()
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX))
  @Transform(({ value }) => value ? sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.PASSWORD_MAX }) : undefined)
  @ValidateIf((o) => o.newPassword !== undefined && o.newPassword !== '')
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.PASSWORD_MIN, { message: `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben` })
  @MaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX, { message: `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben` })
  newPassword?: string;
}
