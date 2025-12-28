import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ADMIN_FIELD_LIMITS, getPreTransformMaxLength } from '@radio-inventar/shared';
import { sanitizeString } from '../../../common/utils';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Benutzername für den Admin',
    example: 'admin',
    minLength: ADMIN_FIELD_LIMITS.USERNAME_MIN,
    maxLength: ADMIN_FIELD_LIMITS.USERNAME_MAX,
  })
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX))
  @Transform(({ value }) =>
    sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.USERNAME_MAX, lowercase: true })
  )
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.USERNAME_MIN)
  @MaxLength(ADMIN_FIELD_LIMITS.USERNAME_MAX)
  username!: string;

  @ApiProperty({
    description: 'Passwort für den Admin',
    minLength: ADMIN_FIELD_LIMITS.PASSWORD_MIN,
    maxLength: ADMIN_FIELD_LIMITS.PASSWORD_MAX,
  })
  @MaxLength(getPreTransformMaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX))
  @Transform(({ value }) => sanitizeString(value, { maxLength: ADMIN_FIELD_LIMITS.PASSWORD_MAX }))
  @IsString()
  @MinLength(ADMIN_FIELD_LIMITS.PASSWORD_MIN)
  @MaxLength(ADMIN_FIELD_LIMITS.PASSWORD_MAX)
  password!: string;
}
