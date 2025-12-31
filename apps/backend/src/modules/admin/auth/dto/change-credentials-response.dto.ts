import { ApiProperty } from '@nestjs/swagger';

export class ChangeCredentialsResponseDto {
  @ApiProperty({ description: 'Erfolgsmeldung' })
  message!: string;

  @ApiProperty({ description: 'Aktueller Benutzername' })
  username!: string;
}
