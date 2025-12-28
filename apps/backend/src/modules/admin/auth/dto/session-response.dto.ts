import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

// Review #2: Added class-validator decorators for response validation
export class SessionResponseDto {
  @ApiProperty({ description: 'Benutzername des eingeloggten Admins', example: 'admin' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'Ob die Session aktuell gültig ist', example: true })
  @IsBoolean()
  isValid!: boolean;
}
