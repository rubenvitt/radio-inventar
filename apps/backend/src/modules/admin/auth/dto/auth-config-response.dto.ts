import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';

export class AuthConfigResponseDto {
  @ApiProperty({
    description: 'Aktiver Admin-Authentifizierungsmodus',
    enum: ['local', 'pocketid'],
    example: 'pocketid',
  })
  @IsIn(['local', 'pocketid'])
  provider!: 'local' | 'pocketid';

  @ApiProperty({
    description: 'Ob Zugangsdaten lokal in der Anwendung geändert werden können',
    example: false,
  })
  @IsBoolean()
  changeCredentialsEnabled!: boolean;
}
