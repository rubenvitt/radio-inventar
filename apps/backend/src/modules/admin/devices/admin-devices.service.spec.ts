import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminDevicesService } from './admin-devices.service';
import { AdminDevicesRepository } from './admin-devices.repository';

describe('AdminDevicesService', () => {
  let service: AdminDevicesService;
  let repository: jest.Mocked<AdminDevicesRepository>;

  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevice = {
    id: 'cuid1234567890abcdefghij',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    status: 'AVAILABLE' as const,
    notes: 'Neues Gerät',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockDevices = [mockDevice];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDevicesService,
        { provide: AdminDevicesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AdminDevicesService>(AdminDevicesService);
    repository = module.get(AdminDevicesRepository);
  });

  describe('create', () => {
    it('should delegate to repository', async () => {
      const createDto = {
        callSign: 'Florian 4-21',
        serialNumber: 'SN-001',
        deviceType: 'Handheld',
        notes: 'Neues Gerät',
      };

      repository.create.mockResolvedValue(mockDevice);

      const result = await service.create(createDto);

      expect(result).toEqual(mockDevice);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should delegate to repository', async () => {
      const updateDto = {
        callSign: 'Florian 4-22',
        notes: 'Updated notes',
      };

      repository.update.mockResolvedValue({
        ...mockDevice,
        ...updateDto,
      });

      const result = await service.update(mockDevice.id, updateDto);

      expect(result).toEqual({
        ...mockDevice,
        ...updateDto,
      });
      expect(repository.update).toHaveBeenCalledWith(mockDevice.id, updateDto);
      expect(repository.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    it('should delegate to repository', async () => {
      const newStatus = 'MAINTENANCE' as const;

      repository.updateStatus.mockResolvedValue({
        ...mockDevice,
        status: newStatus,
      });

      const result = await service.updateStatus(mockDevice.id, newStatus);

      expect(result).toEqual({
        ...mockDevice,
        status: newStatus,
      });
      expect(repository.updateStatus).toHaveBeenCalledWith(mockDevice.id, newStatus);
      expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delegate to repository', async () => {
      repository.delete.mockResolvedValue(undefined);

      await service.delete(mockDevice.id);

      expect(repository.delete).toHaveBeenCalledWith(mockDevice.id);
      expect(repository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should delegate to repository with empty options', async () => {
      repository.findAll.mockResolvedValue(mockDevices);

      const result = await service.findAll();

      expect(result).toEqual(mockDevices);
      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should delegate to repository with status filter', async () => {
      repository.findAll.mockResolvedValue([]);

      await service.findAll({ status: 'AVAILABLE' });

      expect(repository.findAll).toHaveBeenCalledWith({ status: 'AVAILABLE' });
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should delegate to repository with pagination options', async () => {
      repository.findAll.mockResolvedValue([]);

      await service.findAll({ take: 50, skip: 10 });

      expect(repository.findAll).toHaveBeenCalledWith({ take: 50, skip: 10 });
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should delegate to repository with all options', async () => {
      repository.findAll.mockResolvedValue([]);

      await service.findAll({ status: 'ON_LOAN', take: 25, skip: 5 });

      expect(repository.findAll).toHaveBeenCalledWith({ status: 'ON_LOAN', take: 25, skip: 5 });
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return devices with notes field', async () => {
      repository.findAll.mockResolvedValue(mockDevices);

      const result = await service.findAll();

      expect(result[0]).toHaveProperty('notes');
      expect(result[0].notes).toBe('Neues Gerät');
    });
  });

  describe('findOne', () => {
    it('should delegate to repository and return device', async () => {
      repository.findById.mockResolvedValue(mockDevice);

      const result = await service.findOne(mockDevice.id);

      expect(result).toEqual(mockDevice);
      expect(repository.findById).toHaveBeenCalledWith(mockDevice.id);
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should delegate to repository and return null when not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exception propagation', () => {
    it('should propagate NotFoundException from repository on findOne', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should propagate ConflictException from repository on create', async () => {
      const conflictError = new ConflictException('Funkruf existiert bereits');
      repository.create.mockRejectedValue(conflictError);

      await expect(
        service.create({
          callSign: 'Duplicate',
          deviceType: 'Handheld',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate NotFoundException from repository on update', async () => {
      const notFoundError = new NotFoundException('Gerät nicht gefunden');
      repository.update.mockRejectedValue(notFoundError);

      await expect(
        service.update('nonexistent', {
          callSign: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException from repository on delete ON_LOAN device', async () => {
      const conflictError = new ConflictException(
        'Gerät kann nicht gelöscht werden',
      );
      repository.delete.mockRejectedValue(conflictError);

      await expect(service.delete('on-loan-id')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
