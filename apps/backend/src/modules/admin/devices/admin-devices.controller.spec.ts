import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminDevicesService } from './admin-devices.service';
import { PrintTemplateService } from '../services/print-template.service';
import { SessionAuthGuard } from '../../../common/guards/session-auth.guard';
import { ListDevicesQueryDto } from '../../devices/dto/list-devices.query';

describe('AdminDevicesController', () => {
  let controller: AdminDevicesController;
  let service: jest.Mocked<AdminDevicesService>;

  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevice = {
    id: 'cm4abc123def456789012345',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    status: 'AVAILABLE' as const,
    notes: 'Neues Gerät, voller Akku',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockDevices = [
    mockDevice,
    {
      id: 'cm4xyz987fed654321098765',
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
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const mockPrintTemplateService = {
      generateDeviceListPDF: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDevicesController],
      providers: [
        { provide: AdminDevicesService, useValue: mockService },
        { provide: PrintTemplateService, useValue: mockPrintTemplateService },
      ],
    }).compile();

    controller = module.get<AdminDevicesController>(AdminDevicesController);
    service = module.get(AdminDevicesService);
    jest.clearAllMocks();
  });

  // FIX C1: Verify SessionAuthGuard is applied at class level
  describe('Guard Decorators', () => {
    it('should have SessionAuthGuard applied at class level', () => {
      const reflector = new Reflector();
      const guards = reflector.get('__guards__', AdminDevicesController);
      expect(guards).toBeDefined();
      expect(guards).toContain(SessionAuthGuard);
    });
  });

  describe('create', () => {
    it('should create a new device successfully', async () => {
      const inputDto = {
        callSign: 'Florian 4-21',
        serialNumber: 'SN-001',
        deviceType: 'Handheld',
        notes: 'Neues Gerät, voller Akku',
      };

      const expectedDto = {
        callSign: 'Florian 4-21',
        serialNumber: 'SN-001',
        deviceType: 'Handheld',
        notes: 'Neues Gerät, voller Akku',
      };

      service.create.mockResolvedValue(mockDevice);

      const result = await controller.create(inputDto);

      // Controller returns device directly, TransformInterceptor wraps in { data: ... }
      expect(result).toEqual(mockDevice);
      expect(service.create).toHaveBeenCalledWith(expectedDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should create a device without optional notes field', async () => {
      const inputDto = {
        callSign: 'Florian 4-23',
        serialNumber: 'SN-003',
        deviceType: 'Handheld',
      };

      const deviceWithoutNotes = { ...mockDevice, id: 'cm4new123', notes: null };
      service.create.mockResolvedValue(deviceWithoutNotes);

      const result = await controller.create(inputDto);

      expect(result.notes).toBeNull();
      expect(service.create).toHaveBeenCalled();
    });

    it('should throw ZodError for empty callSign (Zod validation)', async () => {
      const invalidDto = {
        callSign: '',
        serialNumber: 'SN-001',
        deviceType: 'Handheld',
      };

      // Zod validation happens in DTO.validate() before service is called
      await expect(controller.create(invalidDto)).rejects.toThrow();
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should propagate duplicate serial number conflict', async () => {
      const validDto = {
        callSign: 'Florian 4-21',
        serialNumber: 'SN-001',
        deviceType: 'Handheld',
      };

      const conflictError = new ConflictException('Seriennummer bereits vorhanden');
      service.create.mockRejectedValue(conflictError);

      await expect(controller.create(validDto)).rejects.toThrow(ConflictException);
    });

    describe('Whitespace handling', () => {
      it('should throw ZodError for whitespace-only callSign', async () => {
        const dto = {
          callSign: '   ',
          deviceType: 'Handheld',
        };
        // Zod validation strips whitespace and rejects empty strings
        await expect(controller.create(dto)).rejects.toThrow();
        expect(service.create).not.toHaveBeenCalled();
      });

      it('should throw ZodError for whitespace-only deviceType', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: '   ',
        };
        // Zod validation strips whitespace and rejects empty strings
        await expect(controller.create(dto)).rejects.toThrow();
        expect(service.create).not.toHaveBeenCalled();
      });

      it('should handle serialNumber with whitespace-only', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          serialNumber: '   ',
        };
        // Sanitizer should trim to empty string, which becomes null for optional field
        service.create.mockResolvedValue({ ...mockDevice, serialNumber: null });
        const result = await controller.create(dto);
        expect(result.serialNumber).toBeNull();
      });
    });

    describe('Unicode edge cases', () => {
      it('should handle zero-width characters in callSign', async () => {
        const dto = {
          callSign: 'Florian\u200B4-21', // Zero-width space
          deviceType: 'Handheld',
        };
        // Zero-width chars should be stripped by sanitizer in DTO.validate()
        service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florian4-21' });
        const result = await controller.create(dto);
        expect(result).toBeDefined();
        // Service receives sanitized data from DTO.validate()
        expect(service.create).toHaveBeenCalled();
      });

      it('should handle combining diacriticals', async () => {
        const dto = {
          callSign: 'Floria\u0301n', // 'á' as combining character
          deviceType: 'Handheld',
        };
        service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florián' });
        const result = await controller.create(dto);
        expect(result).toBeDefined();
      });

      it('should handle RTL override characters', async () => {
        const dto = {
          callSign: 'Florian\u202E4-21', // RTL override
          deviceType: 'Handheld',
        };
        // RTL chars should be stripped by sanitizer in DTO.validate()
        service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florian4-21' });
        const result = await controller.create(dto);
        expect(result).toBeDefined();
      });

      it('should handle notes with emojis (4-byte UTF-8)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: 'Test 📻💾🔊 Radio',
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes).toContain('📻');
        expect(result.notes).toContain('💾');
        expect(result.notes).toContain('🔊');
      });
    });

    describe('MaxLength boundary tests', () => {
      it('should accept callSign at exact max length (50 chars)', async () => {
        const dto = {
          callSign: 'A'.repeat(50),
          deviceType: 'Handheld',
        };
        service.create.mockResolvedValue({ ...mockDevice, callSign: dto.callSign });
        const result = await controller.create(dto);
        expect(result.callSign.length).toBe(50);
      });

      it('should accept deviceType at exact max length (100 chars)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'A'.repeat(100),
        };
        service.create.mockResolvedValue({ ...mockDevice, deviceType: dto.deviceType });
        const result = await controller.create(dto);
        expect(result.deviceType.length).toBe(100);
      });

      it('should accept serialNumber at exact max length (100 chars)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          serialNumber: 'A'.repeat(100),
        };
        service.create.mockResolvedValue({ ...mockDevice, serialNumber: dto.serialNumber });
        const result = await controller.create(dto);
        expect(result.serialNumber?.length).toBe(100);
      });

      it('should accept notes at exact max length (500 chars)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: 'A'.repeat(500),
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes?.length).toBe(500);
      });
    });

    describe('SerialNumber edge cases', () => {
      it('should handle serialNumber with whitespace-only (converts to null)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          serialNumber: '   ',
        };
        // Sanitizer should trim to empty string, which becomes null for optional field
        service.create.mockResolvedValue({ ...mockDevice, serialNumber: null });
        const result = await controller.create(dto);
        expect(result.serialNumber).toBeNull();
      });

      it('should handle serialNumber with Unicode edge cases', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          serialNumber: 'SN-\u200B001', // Zero-width space
        };
        // Zero-width chars should be stripped by sanitizer
        service.create.mockResolvedValue({ ...mockDevice, serialNumber: 'SN-001' });
        const result = await controller.create(dto);
        expect(result).toBeDefined();
        expect(service.create).toHaveBeenCalled();
      });
    });

    describe('Notes field 4-byte UTF-8 (emoji) tests', () => {
      it('should handle notes with single emoji', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: 'Radio 📻',
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes).toBe('Radio 📻');
      });

      it('should handle notes with multiple emojis', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: '🔊 Volume test 📢🎵',
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes).toContain('🔊');
        expect(result.notes).toContain('📢');
        expect(result.notes).toContain('🎵');
      });

      it('should handle notes with emoji flags (multi-codepoint)', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: 'Device from 🇩🇪 Germany',
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes).toContain('🇩🇪');
      });

      it('should handle notes with skin tone modifiers', async () => {
        const dto = {
          callSign: 'Florian 4-21',
          deviceType: 'Handheld',
          notes: 'Assigned to 👨🏽‍🚒',
        };
        service.create.mockResolvedValue({ ...mockDevice, notes: dto.notes });
        const result = await controller.create(dto);
        expect(result.notes).toBeDefined();
      });
    });
  });

  describe('update', () => {
    it('should update device successfully', async () => {
      const updateDto = {
        callSign: 'Florian 4-21 Updated',
        notes: 'Updated notes',
      };

      const updatedDevice = { ...mockDevice, ...updateDto };
      service.update.mockResolvedValue(updatedDevice);

      const result = await controller.update(mockDevice.id, updateDto);

      expect(result).toEqual(updatedDevice);
      expect(service.update).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should update only provided fields', async () => {
      const updateDto = {
        notes: 'Only notes updated',
      };

      const updatedDevice = { ...mockDevice, notes: updateDto.notes };
      service.update.mockResolvedValue(updatedDevice);

      const result = await controller.update(mockDevice.id, updateDto);

      expect(result.notes).toBe(updateDto.notes);
      expect(result.callSign).toBe(mockDevice.callSign);
      expect(service.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when device not found', async () => {
      const updateDto = {
        callSign: 'Florian 4-21 Updated',
      };

      service.update.mockRejectedValue(new NotFoundException('Gerät nicht gefunden'));

      await expect(controller.update('cm4nonexistent123', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.update).toHaveBeenCalled();
    });

    it('should throw ZodError for empty callSign', async () => {
      const updateDto = {
        callSign: '',
      };

      // Zod validation happens in DTO.validate() - empty string after trim is rejected
      await expect(controller.update(mockDevice.id, updateDto)).rejects.toThrow();
      expect(service.update).not.toHaveBeenCalled();
    });

    describe('Empty DTO handling', () => {
      it('should reject empty update DTO', async () => {
        const dto = {};
        await expect(controller.update(mockDevice.id, dto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(controller.update(mockDevice.id, dto)).rejects.toThrow(
          'Keine Felder zum Aktualisieren angegeben',
        );
        expect(service.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateStatus', () => {
    it('should update device status successfully', async () => {
      const statusDto = { status: 'MAINTENANCE' };

      const updatedDevice = { ...mockDevice, status: 'MAINTENANCE' as const };
      service.updateStatus.mockResolvedValue(updatedDevice);

      const result = await controller.updateStatus(mockDevice.id, statusDto);

      expect(result).toEqual(updatedDevice);
      expect(service.updateStatus).toHaveBeenCalledWith(mockDevice.id, 'MAINTENANCE');
      expect(service.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('should update status to DEFECT', async () => {
      const statusDto = { status: 'DEFECT' };

      const updatedDevice = { ...mockDevice, status: 'DEFECT' as const };
      service.updateStatus.mockResolvedValue(updatedDevice);

      const result = await controller.updateStatus(mockDevice.id, statusDto);

      expect(result.status).toBe('DEFECT');
      expect(service.updateStatus).toHaveBeenCalledWith(mockDevice.id, 'DEFECT');
    });

    it('should throw NotFoundException when device not found', async () => {
      const statusDto = { status: 'MAINTENANCE' };

      service.updateStatus.mockRejectedValue(new NotFoundException('Gerät nicht gefunden'));

      await expect(controller.updateStatus('cm4nonexistent123', statusDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.updateStatus).toHaveBeenCalledWith('cm4nonexistent123', 'MAINTENANCE');
    });

    it('should throw ZodError for invalid status', async () => {
      const statusDto = { status: 'INVALID_STATUS' };

      // Zod validation rejects invalid enum values in DTO.validate()
      await expect(controller.updateStatus(mockDevice.id, statusDto)).rejects.toThrow();
      expect(service.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ZodError for ON_LOAN status (not allowed for admin)', async () => {
      const statusDto = { status: 'ON_LOAN' };

      // Zod DeviceStatusAdminUpdateEnum rejects ON_LOAN
      await expect(controller.updateStatus(mockDevice.id, statusDto)).rejects.toThrow();
      expect(service.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete device successfully', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockDevice.id);

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith(mockDevice.id, { force: false });
      expect(service.delete).toHaveBeenCalledTimes(1);
    });

    it('should delete device with force=true when force query param is "1"', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockDevice.id, '1');

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith(mockDevice.id, { force: true });
    });

    it('should delete device with force=true when force query param is "true"', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockDevice.id, 'true');

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith(mockDevice.id, { force: true });
    });

    it('should throw NotFoundException when device not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException('Gerät nicht gefunden'));

      await expect(controller.delete('cm4nonexistent123')).rejects.toThrow(NotFoundException);
      expect(service.delete).toHaveBeenCalledWith('cm4nonexistent123', { force: false });
    });

    it('should throw ConflictException when device is on loan (without force)', async () => {
      service.delete.mockRejectedValue(
        new ConflictException('Gerät kann nicht gelöscht werden, da es ausgeliehen ist'),
      );

      await expect(controller.delete(mockDevice.id)).rejects.toThrow(ConflictException);
      expect(service.delete).toHaveBeenCalledWith(mockDevice.id, { force: false });
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      service.delete.mockRejectedValue(dbError);

      await expect(controller.delete(mockDevice.id)).rejects.toThrow('Database connection failed');
    });
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
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter devices by status AVAILABLE', async () => {
      const availableDevices = [mockDevices[0]];
      service.findAll.mockResolvedValue(availableDevices);
      const query: ListDevicesQueryDto = { status: 'AVAILABLE' };

      const result = await controller.findAll(query);

      expect(result).toEqual(availableDevices);
      expect(service.findAll).toHaveBeenCalledWith({
        status: 'AVAILABLE',
        take: undefined,
        skip: undefined,
      });
    });

    it('should filter devices by status ON_LOAN', async () => {
      const loanedDevices = [mockDevices[1]];
      service.findAll.mockResolvedValue(loanedDevices);
      const query: ListDevicesQueryDto = { status: 'ON_LOAN' };

      const result = await controller.findAll(query);

      expect(result).toEqual(loanedDevices);
      expect(service.findAll).toHaveBeenCalledWith({
        status: 'ON_LOAN',
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

    it('should return devices with notes field', async () => {
      service.findAll.mockResolvedValue(mockDevices);
      const query: ListDevicesQueryDto = {};

      const result = await controller.findAll(query);

      expect(result[0]).toHaveProperty('notes');
      expect(result[0].notes).toBe('Neues Gerät, voller Akku');
      expect(result[1].notes).toBeNull();
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      service.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow('Service error');
    });

    it('should handle MAINTENANCE status filter', async () => {
      const maintenanceDevice = { ...mockDevice, status: 'MAINTENANCE' as const };
      service.findAll.mockResolvedValue([maintenanceDevice]);
      const query: ListDevicesQueryDto = { status: 'MAINTENANCE' };

      const result = await controller.findAll(query);

      expect(result).toEqual([maintenanceDevice]);
      expect(service.findAll).toHaveBeenCalledWith({
        status: 'MAINTENANCE',
        take: undefined,
        skip: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return device successfully', async () => {
      service.findOne.mockResolvedValue(mockDevice);

      const result = await controller.findOne(mockDevice.id);

      expect(result).toEqual(mockDevice);
      expect(service.findOne).toHaveBeenCalledWith(mockDevice.id);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when device not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne('cm4nonexistent123')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('cm4nonexistent123')).rejects.toThrow(
        'Gerät nicht gefunden',
      );
      expect(service.findOne).toHaveBeenCalledWith('cm4nonexistent123');
    });

    it('should return device with notes field', async () => {
      service.findOne.mockResolvedValue(mockDevice);

      const result = await controller.findOne(mockDevice.id);

      expect(result).toHaveProperty('notes');
      expect(result.notes).toBe('Neues Gerät, voller Akku');
    });

    it('should return device with null notes', async () => {
      const deviceWithoutNotes = { ...mockDevice, notes: null };
      service.findOne.mockResolvedValue(deviceWithoutNotes);

      const result = await controller.findOne(mockDevice.id);

      expect(result.notes).toBeNull();
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      service.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockDevice.id)).rejects.toThrow('Database error');
    });

    it('should handle different device statuses', async () => {
      const loanedDevice = { ...mockDevice, status: 'ON_LOAN' as const };
      service.findOne.mockResolvedValue(loanedDevice);

      const result = await controller.findOne(loanedDevice.id);

      expect(result.status).toBe('ON_LOAN');
    });
  });

  describe('ID validation (ParseCuid2Pipe)', () => {
    it('should accept valid CUID2 format', async () => {
      service.findOne.mockResolvedValue(mockDevice);
      // Valid CUID2: starts with 'c', lowercase alphanumeric, typically 24-25 chars
      const result = await controller.findOne('cm4abc123def456789012345');
      expect(result).toBeDefined();
    });

    // Note: These tests verify controller behavior when pipe would reject
    // In actual runtime, ParseCuid2Pipe throws BadRequestException before controller is called
    it('should propagate BadRequestException for invalid ID from pipe', async () => {
      service.findOne.mockRejectedValue(new BadRequestException('Ungültiges ID-Format'));
      await expect(controller.findOne('invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException for empty ID from pipe', async () => {
      service.findOne.mockRejectedValue(new BadRequestException('Ungültiges ID-Format'));
      await expect(controller.findOne('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Log injection prevention', () => {
    it('should sanitize callSign with newlines before logging', async () => {
      const logSpy = jest.spyOn((controller as any).logger, 'log');
      const maliciousDto = {
        callSign: 'Florian 4-21\nFake log entry',
        deviceType: 'Handheld',
      };
      service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florian 4-21Fake log entry' });

      const result = await controller.create(maliciousDto);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalled();

      // Verify log output does not contain newline
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Florian 4-21Fake log entry'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('\n'),
      );
      logSpy.mockRestore();
    });

    it('should sanitize callSign with carriage returns', async () => {
      const logSpy = jest.spyOn((controller as any).logger, 'log');
      const maliciousDto = {
        callSign: 'Florian 4-21\rFake',
        deviceType: 'Handheld',
      };
      service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florian 4-21Fake' });

      const result = await controller.create(maliciousDto);
      expect(result).toBeDefined();

      // Verify log output does not contain carriage return
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Florian 4-21Fake'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('\r'),
      );
      logSpy.mockRestore();
    });

    it('should sanitize callSign with tabs', async () => {
      const logSpy = jest.spyOn((controller as any).logger, 'log');
      const maliciousDto = {
        callSign: 'Florian\t4-21',
        deviceType: 'Handheld',
      };
      service.create.mockResolvedValue({ ...mockDevice, callSign: 'Florian4-21' });

      const result = await controller.create(maliciousDto);
      expect(result).toBeDefined();

      // Verify log output does not contain tab
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Florian4-21'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('\t'),
      );
      logSpy.mockRestore();
    });
  });
});
