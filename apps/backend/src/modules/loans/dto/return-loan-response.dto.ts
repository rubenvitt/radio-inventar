import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatusEnum } from '@radio-inventar/shared';

/**
 * L3 R3: DeviceInfoDto is internal to ReturnLoanResponseDto and should not be exported.
 * It's only used as a nested type within the response DTO for Swagger documentation.
 *
 * Properties are marked with definite assignment assertion (!)
 * because they are initialized by Prisma queries and class-transformer
 * during serialization, not through constructor assignment.
 */
class DeviceInfoDto {
  @ApiProperty({
    description: 'Device ID',
    example: 'cm6kqmc1100001hm1csttvdz',
  })
  id!: string;

  @ApiProperty({
    description: 'Rufzeichen des Geräts',
    example: 'Florian 4-23',
  })
  callSign!: string;

  @ApiProperty({
    description: 'Status des Geräts',
    enum: DeviceStatusEnum.options,
    example: 'AVAILABLE',
  })
  status!: string;
}

export class ReturnLoanResponseDto {
  @ApiProperty({
    description: 'Loan ID',
    example: 'cm6kqmc1200001hm1abcd123',
  })
  id!: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'cm6kqmc1100001hm1csttvdz',
  })
  deviceId!: string;

  @ApiProperty({
    description: 'Name des Entleihers',
    example: 'Tim S.',
  })
  borrowerName!: string;

  @ApiProperty({
    description: 'Zeitpunkt der Ausleihe',
    example: '2025-01-15T10:30:00.000Z',
  })
  borrowedAt!: Date;

  @ApiProperty({
    description: 'Zeitpunkt der Rückgabe',
    example: '2025-01-15T14:45:00.000Z',
    required: true,
  })
  returnedAt!: Date;

  @ApiProperty({
    description: 'Optionale Zustandsnotiz',
    example: 'Akku schwach',
    nullable: true,
  })
  returnNote!: string | null;

  @ApiProperty({
    description: 'Geräte-Informationen',
    type: DeviceInfoDto,
  })
  device!: DeviceInfoDto;
}
