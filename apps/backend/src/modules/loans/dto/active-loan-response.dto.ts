import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatusEnum } from '@radio-inventar/shared';

class DeviceInfoDto {
  @ApiProperty({
    description: 'Device ID',
    example: 'cm6kqmc1100001hm1csttvdz',
  })
  id!: string;

  @ApiProperty({
    description: 'Rufzeichen des Geräts',
    example: 'DMO-001',
  })
  callSign!: string;

  @ApiProperty({
    description: 'Status des Geräts',
    enum: DeviceStatusEnum.options,
    example: 'ON_LOAN',
  })
  status!: string;
}

export class ActiveLoanResponseDto {
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
    example: 'Max Mustermann',
  })
  borrowerName!: string;

  @ApiProperty({
    description: 'Zeitpunkt der Ausleihe',
    example: '2025-01-15T10:30:00Z',
  })
  borrowedAt!: Date;

  @ApiProperty({
    description: 'Device Informationen',
    type: DeviceInfoDto,
  })
  device!: DeviceInfoDto;
}
