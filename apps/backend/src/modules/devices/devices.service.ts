import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';
import { mapRadioAdminStatus, type DeviceStatus } from '@radio-inventar/shared';
import { DeviceResponseDto } from './dto/device-response.dto';

export interface FindDevicesOptions {
  status?: DeviceStatus | undefined;
  take?: number | undefined;
  skip?: number | undefined;
}

/**
 * Public device read layer. Devices are the master data of radio-admin and are
 * fetched read-only via RadioAdminService; the per-device status is composed
 * here by overlaying radio-inventar's own active loans (ON_LOAN) on top of the
 * radio-admin condition. No device data is stored locally.
 */
@Injectable()
export class DevicesService {
  constructor(
    private readonly radioAdminService: RadioAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(options: FindDevicesOptions = {}): Promise<DeviceResponseDto[]> {
    const [devices, activeLoans] = await Promise.all([
      this.radioAdminService.fetchLoanableDevices(),
      this.prisma.loan.findMany({ where: { returnedAt: null }, select: { deviceId: true } }),
    ]);
    const activeDeviceIds = new Set(activeLoans.map((loan) => loan.deviceId));

    let result: DeviceResponseDto[] = devices.map((device) => ({
      id: device.id,
      callSign: device.rufname ?? device.issi,
      serialNumber: device.serialNumber,
      deviceType: device.deviceType,
      status: mapRadioAdminStatus(device.status, activeDeviceIds.has(device.id)),
    }));

    if (options.status) {
      result = result.filter((device) => device.status === options.status);
    }

    result.sort((a, b) => a.callSign.localeCompare(b.callSign));

    const skip = options.skip ?? 0;
    const take = options.take ?? result.length;
    return result.slice(skip, skip + take);
  }
}
