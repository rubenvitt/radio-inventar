import { Injectable } from '@nestjs/common';
import { DevicesService, FindDevicesOptions } from '../../devices/devices.service';
import { DeviceResponseDto } from '../../devices/dto/device-response.dto';

/**
 * Admin device view — read-only. Device master data is managed in radio-admin;
 * radio-inventar only displays the composed list (no create/update/delete here).
 * Delegates to the shared DevicesService so the admin and public views stay in
 * sync (same radio-admin source + active-loan overlay).
 */
@Injectable()
export class AdminDevicesService {
  constructor(private readonly devicesService: DevicesService) {}

  async findAll(options: FindDevicesOptions = {}): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll(options);
  }

  async findOne(id: string): Promise<DeviceResponseDto | null> {
    const devices = await this.devicesService.findAll();
    return devices.find((device) => device.id === id) ?? null;
  }
}
