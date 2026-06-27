import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminDevicesService } from './admin-devices.service';
import { PrintTemplateService } from '../services/print-template.service';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';
import { ListDevicesQueryDto } from '../../devices/dto/list-devices.query';

describe('AdminDevicesController (read-only)', () => {
  let controller: AdminDevicesController;
  let service: jest.Mocked<AdminDevicesService>;
  let printTemplateService: { generateDeviceListPDF: jest.Mock };

  const mockDevices = [
    { id: 'cm4abc123def456789012345', callSign: 'Florian 4-21', serialNumber: 'SN-001', deviceType: 'Handheld', status: 'AVAILABLE' },
    { id: 'cm4xyz987fed654321098765', callSign: 'Florian 4-22', serialNumber: null, deviceType: 'Handheld', status: 'ON_LOAN' },
  ];

  beforeEach(async () => {
    const mockService = { findAll: jest.fn(), findOne: jest.fn() };
    printTemplateService = { generateDeviceListPDF: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDevicesController],
      providers: [
        { provide: AdminDevicesService, useValue: mockService },
        { provide: PrintTemplateService, useValue: printTemplateService },
      ],
    }).compile();

    controller = module.get<AdminDevicesController>(AdminDevicesController);
    service = module.get(AdminDevicesService);
    jest.clearAllMocks();
  });

  it('is guarded by SessionAuthGuard at class level', () => {
    const guards = new Reflector().get<unknown[]>('__guards__', AdminDevicesController) ?? [];
    expect(guards).toContain(SessionAuthGuard);
  });

  it('does not expose write endpoints', () => {
    const proto = AdminDevicesController.prototype as unknown as Record<string, unknown>;
    expect(proto.create).toBeUndefined();
    expect(proto.update).toBeUndefined();
    expect(proto.updateStatus).toBeUndefined();
    expect(proto.delete).toBeUndefined();
  });

  describe('findAll', () => {
    it('delegates to the service with the query filters', async () => {
      service.findAll.mockResolvedValue(mockDevices);
      const query: ListDevicesQueryDto = { status: 'AVAILABLE', take: 25, skip: 5 };

      const result = await controller.findAll(query);

      expect(result).toEqual(mockDevices);
      expect(service.findAll).toHaveBeenCalledWith({ status: 'AVAILABLE', take: 25, skip: 5 });
    });
  });

  describe('findOne', () => {
    it('returns the device when found', async () => {
      service.findOne.mockResolvedValue(mockDevices[0]);
      const result = await controller.findOne('cm4abc123def456789012345');
      expect(result).toEqual(mockDevices[0]);
    });

    it('throws NotFound when the device is missing', async () => {
      service.findOne.mockResolvedValue(null);
      await expect(controller.findOne('cm4abc123def456789012345')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPrintTemplate', () => {
    it('streams the generated PDF', async () => {
      const buffer = Buffer.from('%PDF-1.4');
      printTemplateService.generateDeviceListPDF.mockResolvedValue(buffer);
      const res = {
        set: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as import('express').Response;

      await controller.getPrintTemplate(res);

      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});
