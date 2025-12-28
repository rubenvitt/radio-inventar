import { ApiProperty } from '@nestjs/swagger';

export class BorrowerSuggestionResponseDto {
  @ApiProperty({
    description: 'Name des Ausleihers',
    example: 'Max Mustermann',
    minLength: 1,
    maxLength: 100,
  })
  name!: string;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Ausleihe dieses Ausleihers',
    example: '2025-12-14T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  lastUsed!: Date;
}
