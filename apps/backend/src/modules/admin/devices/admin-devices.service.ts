import { Injectable } from '@nestjs/common';
import {
  AdminDevicesRepository,
  FindAllDevicesOptions,
  CreateDeviceInput,
  UpdateDeviceInput,
} from './admin-devices.repository';
import type { DeviceStatus } from '@radio-inventar/shared';
import type { Device } from '@prisma/client';

@Injectable()
export class AdminDevicesService {
  constructor(private readonly adminDevicesRepository: AdminDevicesRepository) {}

  async create(dto: CreateDeviceInput): Promise<Device> {
    return this.adminDevicesRepository.create(dto);
  }

  async update(id: string, dto: UpdateDeviceInput): Promise<Device> {
    return this.adminDevicesRepository.update(id, dto);
  }

  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    return this.adminDevicesRepository.updateStatus(id, status);
  }

  async delete(id: string): Promise<void> {
    return this.adminDevicesRepository.delete(id);
  }

  async findAll(options: FindAllDevicesOptions = {}): Promise<Device[]> {
    return this.adminDevicesRepository.findAll(options);
  }

  async findOne(id: string): Promise<Device | null> {
    return this.adminDevicesRepository.findById(id);
  }
}
