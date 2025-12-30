import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PrintTemplateService } from '../admin/services/print-template.service';
import { ListDevicesQueryDto } from './dto/list-devices.query';

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevices = [
    {
      id: 'cuid1234567890abcdefghij',
      callSign: 'Florian 4-21',
      serialNumber: 'SN-001',
      deviceType: 'Handheld',
      status: 'AVAILABLE' as const,
      notes: 'Neues Gerät, voller Akku',
      createdAt: mockDate,
      updatedAt: mockDate,
    },
    {
      id: 'cuid0987654321abcdefghij',
      callSign: 'Florian 4-22',
      serialNumber: 'SN-002',
      deviceType: 'Handheld',
      status: 'ON_LOAN' as const,
      notes: null,
      createdAt: mockDate,
      updatedAt: mockDate,
    },
  ];

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
    };

    const mockPrintTemplateService = {
      generateDeviceListPDF: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: DevicesService, useValue: mockService },
        { provide: PrintTemplateService, useValue: mockPrintTemplateService },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService);
  });

  describe('findAll', () => {
    it('should return array of devices when no filter provided', async () => {
      service.findAll.mockResolvedValue(mockDevices);
      const query: ListDevicesQueryDto = {};

      const result = await controller.findAll(query);

      expect(result).toEqual(mockDevices);
      expect(service.findAll).toHaveBeenCalledWith({
        status: undefined,
        take: undefined,
        skip: undefined,
      });
    });

    it('should pass status filter to service via DTO', async () => {
      service.findAll.mockResolvedValue([mockDevices[0]]);
      const query: ListDevicesQueryDto = { status: 'AVAILABLE' };

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith({
        status: 'AVAILABLE',
        take: undefined,
        skip: undefined,
      });
    });

    it('should pass pagination options to service', async () => {
      service.findAll.mockResolvedValue([]);
      const query: ListDevicesQueryDto = { take: 50, skip: 10 };

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith({
        status: undefined,
        take: 50,
        skip: 10,
      });
    });

    it('should pass all options to service', async () => {
      service.findAll.mockResolvedValue([]);
      const query: ListDevicesQueryDto = { status: 'DEFECT', take: 25, skip: 5 };

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith({
        status: 'DEFECT',
        take: 25,
        skip: 5,
      });
    });

    it('should return empty array when no devices match filter', async () => {
      service.findAll.mockResolvedValue([]);
      const query: ListDevicesQueryDto = { status: 'DEFECT' };

      const result = await controller.findAll(query);

      expect(result).toEqual([]);
    });

    it('should return devices with notes field (AC#1 requirement)', async () => {
      service.findAll.mockResolvedValue(mockDevices);
      const query: ListDevicesQueryDto = {};

      const result = await controller.findAll(query);

      expect(result[0]).toHaveProperty('notes');
      expect(result[0].notes).toBe('Neues Gerät, voller Akku');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      service.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow('Service error');
    });
  });
});
