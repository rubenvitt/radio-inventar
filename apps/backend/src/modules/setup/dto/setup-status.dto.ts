import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetupStatusDto {
  @ApiProperty({
    description: 'Ob die Ersteinrichtung abgeschlossen ist (Admin existiert)',
    example: false,
  })
  @IsBoolean()
  isSetupComplete!: boolean;
}
