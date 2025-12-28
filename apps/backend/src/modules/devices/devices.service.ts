import { Injectable } from '@nestjs/common';
import { DevicesRepository } from './devices.repository';
import type { DeviceStatus } from '@radio-inventar/shared';
import type { Device } from '@prisma/client';

export interface FindDevicesOptions {
  status?: DeviceStatus | undefined;
  take?: number | undefined;
  skip?: number | undefined;
}

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  async findAll(options: FindDevicesOptions = {}): Promise<Device[]> {
    // Service-level logging removed - Controller handles logging, Repository handles debug
    return this.devicesRepository.findAll(options);
  }
}
