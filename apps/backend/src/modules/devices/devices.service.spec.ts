import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';

describe('DevicesService', () => {
  let service: DevicesService;
  let repository: jest.Mocked<DevicesRepository>;

  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockDevices = [
    {
      id: 'cuid1234567890abcdefghij',
      callSign: 'Florian 4-21',
      serialNumber: 'SN-001',
      deviceType: 'Handheld',
      status: 'AVAILABLE' as const,
      notes: 'Neues Gerät',
      createdAt: mockDate,
      updatedAt: mockDate,
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: DevicesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    repository = module.get(DevicesRepository);
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
});
