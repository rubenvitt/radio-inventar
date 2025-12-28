import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testDeviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Cleanup existing test data
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});

    // Seed test data
    const testDevice = await prisma.device.create({
      data: {
        callSign: 'Florian 4-TEST-01',
        serialNumber: 'TEST-SN-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: 'Test device with notes',
      },
    });
    testDeviceId = testDevice.id;

    await prisma.device.create({
      data: {
        callSign: 'Florian 4-TEST-02',
        serialNumber: 'TEST-SN-002',
        deviceType: 'Vehicular',
        status: 'ON_LOAN',
        notes: null,
      },
    });

    await prisma.device.create({
      data: {
        callSign: 'Florian 4-TEST-03',
        serialNumber: 'TEST-SN-003',
        deviceType: 'Base Station',
        status: 'AVAILABLE',
        notes: 'Another available test device',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await app.close();
  });

  describe('GET /api/devices', () => {
    it('should return 200 and array of devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/devices')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should wrap response in { data: [...] } format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/devices')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeDefined();
    });

    it('should filter by status when query param provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/devices?status=AVAILABLE')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Verify all returned devices have AVAILABLE status
      response.body.data.forEach((device: { status: string }) => {
        expect(device.status).toBe('AVAILABLE');
      });
    });

    it('should return device with expected fields including notes (AC#1)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/devices')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const device = response.body.data[0];
      expect(device).toHaveProperty('id');
      expect(device).toHaveProperty('callSign');
      expect(device).toHaveProperty('serialNumber');
      expect(device).toHaveProperty('deviceType');
      expect(device).toHaveProperty('status');
      expect(device).toHaveProperty('notes');
    });

    it('should return 400 for invalid status filter', async () => {
      await request(app.getHttpServer())
        .get('/api/devices?status=INVALID_STATUS')
        .expect(400);
    });

    it('should handle empty string status parameter gracefully', async () => {
      // Empty string is not a valid DeviceStatus enum value
      // ValidationPipe should reject it with 400 Bad Request
      const response = await request(app.getHttpServer())
        .get('/api/devices?status=')
        .expect(400);

      // Verify error response structure
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });
});
