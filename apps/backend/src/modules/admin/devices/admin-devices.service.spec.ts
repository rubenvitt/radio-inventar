import { Test, TestingModule } from '@nestjs/testing';
import { AdminDevicesService } from './admin-devices.service';
import { DevicesService } from '../../devices/devices.service';

describe('AdminDevicesService (read-only)', () => {
  let service: AdminDevicesService;
  let devicesService: { findAll: jest.Mock };

  const devices = [
    { id: 'a', callSign: 'A', serialNumber: null, deviceType: 'HRT', status: 'AVAILABLE' },
    { id: 'b', callSign: 'B', serialNumber: 'SN-2', deviceType: 'HRT', status: 'ON_LOAN' },
  ];

  beforeEach(async () => {
    devicesService = { findAll: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminDevicesService, { provide: DevicesService, useValue: devicesService }],
    }).compile();
    service = module.get<AdminDevicesService>(AdminDevicesService);
  });

  it('findAll delegates to the shared DevicesService', async () => {
    devicesService.findAll.mockResolvedValue(devices);
    const result = await service.findAll({ status: 'AVAILABLE', take: 10, skip: 0 });
    expect(result).toEqual(devices);
    expect(devicesService.findAll).toHaveBeenCalledWith({ status: 'AVAILABLE', take: 10, skip: 0 });
  });

  it('findOne returns the matching device', async () => {
    devicesService.findAll.mockResolvedValue(devices);
    expect(await service.findOne('b')).toMatchObject({ id: 'b' });
  });

  it('findOne returns null when the device is not present', async () => {
    devicesService.findAll.mockResolvedValue(devices);
    expect(await service.findOne('does-not-exist')).toBeNull();
  });
});
