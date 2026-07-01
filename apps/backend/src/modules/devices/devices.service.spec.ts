import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';

function raDevice(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'id-1',
    issi: '1001',
    opta: null,
    rufname: 'Florian 4-21',
    status: 'Einsatzbereit',
    location: null,
    deviceType: 'Handheld',
    serialNumber: 'SN-001',
    hersteller: null,
    bedieneinheit: null,
    funktion: null,
    ...over,
  };
}

function raActiveLoan(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'l1',
    deviceId: 'id-2',
    snapshotCallSign: 'x',
    snapshotDeviceType: null,
    borrowerName: 'b',
    borrowedAt: 1,
    ...over,
  };
}

describe('DevicesService', () => {
  let service: DevicesService;
  let radioAdmin: { fetchLoanableDevices: jest.Mock; fetchActiveLoans: jest.Mock };

  beforeEach(async () => {
    radioAdmin = {
      fetchLoanableDevices: jest.fn().mockResolvedValue([]),
      fetchActiveLoans: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: RadioAdminService, useValue: radioAdmin },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('composes devices from radio-admin with AVAILABLE when no active loan', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice()]);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 'id-1', callSign: 'Florian 4-21', serialNumber: 'SN-001', deviceType: 'Handheld', status: 'AVAILABLE', location: null },
    ]);
  });

  it('passes the radio-admin location through to the response', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice({ location: 'FüKW' })]);

    const result = await service.findAll();

    expect(result[0].location).toBe('FüKW');
  });

  it('overlays ON_LOAN for devices with an active loan from radio-admin', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice({ id: 'id-1' }), raDevice({ id: 'id-2', rufname: 'B' })]);
    radioAdmin.fetchActiveLoans.mockResolvedValue([raActiveLoan({ deviceId: 'id-2' })]);

    const result = await service.findAll();

    expect(result.find((d) => d.id === 'id-1')!.status).toBe('AVAILABLE');
    expect(result.find((d) => d.id === 'id-2')!.status).toBe('ON_LOAN');
  });

  it('maps radio-admin condition to DEFECT / MAINTENANCE', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([
      raDevice({ id: 'd', rufname: 'D', status: 'Defekt' }),
      raDevice({ id: 'w', rufname: 'W', status: 'Wartung' }),
    ]);

    const result = await service.findAll();
    expect(result.find((d) => d.id === 'd')!.status).toBe('DEFECT');
    expect(result.find((d) => d.id === 'w')!.status).toBe('MAINTENANCE');
  });

  it('falls back to issi when rufname is null', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice({ rufname: null, issi: '9999' })]);
    const result = await service.findAll();
    expect(result[0].callSign).toBe('9999');
  });

  it('filters by status', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([
      raDevice({ id: 'a', rufname: 'A' }),
      raDevice({ id: 'd', rufname: 'D', status: 'Defekt' }),
    ]);

    const result = await service.findAll({ status: 'DEFECT' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d');
  });

  it('applies take/skip pagination', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([
      raDevice({ id: '1', rufname: 'A' }),
      raDevice({ id: '2', rufname: 'B' }),
      raDevice({ id: '3', rufname: 'C' }),
    ]);

    const result = await service.findAll({ take: 1, skip: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].callSign).toBe('B');
  });
});
