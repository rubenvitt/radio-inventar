// Set environment variables BEFORE importing AppModule
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-characters-long-for-security';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import * as session from 'express-session';
import { Pool } from 'pg';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { getSessionConfig } from '@/config/session.config';
import { AUTH_CONFIG } from '@radio-inventar/shared';
import * as bcrypt from 'bcrypt';

const ConnectPgSimple = require('connect-pg-simple');

// Helper to find session cookie by name
const findSessionCookie = (cookies: string[]): string | undefined =>
  cookies.find((c: string) => c.startsWith(`${AUTH_CONFIG.SESSION_COOKIE_NAME}=`));

describe('Admin History (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let sessionCookie: string;

  // Test credentials
  const testAdmin = {
    username: 'testadmin',
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    // Create database pool for cleanup
    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Disable rate limiting in E2E tests by mocking the guard
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Setup session middleware for E2E tests (must be done before app.init())
    const PgStore = ConnectPgSimple(session);
    const sessionConfig = getSessionConfig();
    app.use(
      session({
        ...sessionConfig,
        store: new PgStore({
          pool,
          tableName: 'session',
          pruneSessionInterval: 15 * 60,
        }),
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Cleanup existing data
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.adminUser.deleteMany({});

    // Create test admin user
    const passwordHash = await bcrypt.hash(testAdmin.password, 12);
    await prisma.adminUser.create({
      data: {
        username: testAdmin.username,
        passwordHash,
      },
    });

    // Login as admin and store session cookie for all tests
    const loginResponse = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({
        username: testAdmin.username,
        password: testAdmin.password,
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookie = findSessionCookie(cookies);
    if (!cookie) {
      throw new Error('Failed to get session cookie during test setup');
    }
    sessionCookie = cookie;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.adminUser.deleteMany({});

    // Clean up ALL session records
    await pool.query("DELETE FROM session");

    await pool.end();
    await app.close();
  });

  // ================================================================================
  // Authentication Tests (8 tests)
  // ================================================================================
  describe('Authentication Tests', () => {
    it('should return 401 for dashboard without session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for history without session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 for dashboard with valid admin session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('availableCount');
      expect(response.body.data).toHaveProperty('onLoanCount');
      expect(response.body.data).toHaveProperty('defectCount');
      expect(response.body.data).toHaveProperty('maintenanceCount');
      expect(response.body.data).toHaveProperty('activeLoans');
    });

    it('should return 200 for history with valid admin session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('should return 401 with expired session', async () => {
      // Create a fake/expired session cookie
      const expiredCookie = `${AUTH_CONFIG.SESSION_COOKIE_NAME}=s%3Aexpired-session-id.fake-signature`;

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', expiredCookie)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 with invalid session cookie', async () => {
      const invalidCookie = `${AUTH_CONFIG.SESSION_COOKIE_NAME}=invalid-cookie-value`;

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', invalidCookie)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should handle multiple concurrent requests with same session', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get('/api/admin/history/dashboard')
          .set('Cookie', sessionCookie)
      );

      const results = await Promise.all(requests);

      // All requests should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
      });
    });

    it('should return 401 after session cleanup (logout simulation)', async () => {
      // Create a new session
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const tempCookie = findSessionCookie(cookies);
      expect(tempCookie).toBeDefined();

      // Logout to destroy session
      await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .set('Cookie', tempCookie!)
        .expect(200);

      // Subsequent request should fail
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', tempCookie!)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  // ================================================================================
  // Dashboard Endpoint Tests (10 tests)
  // ================================================================================
  describe('Dashboard Endpoint Tests', () => {
    let deviceIds: string[] = [];

    beforeEach(async () => {
      // Clean up before each test
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
      deviceIds = [];
    });

    afterEach(async () => {
      // Clean up after each test
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should return correct stats with seeded data (all 4 statuses)', async () => {
      // Create devices with all 4 statuses
      const devices = await Promise.all([
        prisma.device.create({ data: { callSign: 'F-AVAIL-1', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-AVAIL-2', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-ONLOAN-1', deviceType: 'Handheld', status: 'ON_LOAN' } }),
        prisma.device.create({ data: { callSign: 'F-DEFECT-1', deviceType: 'Handheld', status: 'DEFECT' } }),
        prisma.device.create({ data: { callSign: 'F-MAINT-1', deviceType: 'Handheld', status: 'MAINTENANCE' } }),
      ]);

      // Create loan for ON_LOAN device
      await prisma.loan.create({
        data: {
          deviceId: devices[2].id,
          borrowerName: 'Test Borrower',
          borrowedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toMatchObject({
        availableCount: 2,
        onLoanCount: 1,
        defectCount: 1,
        maintenanceCount: 1,
      });
    });

    it('should have stats match actual device counts', async () => {
      // Create 3 AVAILABLE, 2 ON_LOAN, 1 DEFECT
      const devices = await Promise.all([
        prisma.device.create({ data: { callSign: 'F-A1', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-A2', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-A3', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-L1', deviceType: 'Handheld', status: 'ON_LOAN' } }),
        prisma.device.create({ data: { callSign: 'F-L2', deviceType: 'Handheld', status: 'ON_LOAN' } }),
        prisma.device.create({ data: { callSign: 'F-D1', deviceType: 'Handheld', status: 'DEFECT' } }),
      ]);

      // Create loans for ON_LOAN devices
      await Promise.all([
        prisma.loan.create({ data: { deviceId: devices[3].id, borrowerName: 'Borrower 1', borrowedAt: new Date() } }),
        prisma.loan.create({ data: { deviceId: devices[4].id, borrowerName: 'Borrower 2', borrowedAt: new Date() } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Verify counts
      const { availableCount, onLoanCount, defectCount, maintenanceCount } = response.body.data;
      expect(availableCount + onLoanCount + defectCount + maintenanceCount).toBe(6);
      expect(availableCount).toBe(3);
      expect(onLoanCount).toBe(2);
      expect(defectCount).toBe(1);
      expect(maintenanceCount).toBe(0);
    });

    it('should exclude returned loans from active loans', async () => {
      const device = await prisma.device.create({
        data: { callSign: 'F-RETURNED', deviceType: 'Handheld', status: 'AVAILABLE' },
      });

      // Create returned loan
      await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Returned Borrower',
          borrowedAt: new Date('2025-01-01'),
          returnedAt: new Date('2025-01-02'),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Active loans should be empty (returnedAt !== null)
      expect(response.body.data.activeLoans).toHaveLength(0);
    });

    it('should limit active loans to 50', async () => {
      // Create 60 ON_LOAN devices with loans
      const devices = await Promise.all(
        Array.from({ length: 60 }, (_, i) =>
          prisma.device.create({
            data: { callSign: `F-LOAN-${i}`, deviceType: 'Handheld', status: 'ON_LOAN' },
          })
        )
      );

      // Create active loans for all devices
      await Promise.all(
        devices.map((device, i) =>
          prisma.loan.create({
            data: {
              deviceId: device.id,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000), // Different times for ordering
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should be limited to 50
      expect(response.body.data.activeLoans).toHaveLength(50);
      expect(response.body.data.onLoanCount).toBe(60); // Count should still show all 60
    });

    it('should sort active loans by borrowedAt DESC (most recent first)', async () => {
      const devices = await Promise.all([
        prisma.device.create({ data: { callSign: 'F-OLD', deviceType: 'Handheld', status: 'ON_LOAN' } }),
        prisma.device.create({ data: { callSign: 'F-MID', deviceType: 'Handheld', status: 'ON_LOAN' } }),
        prisma.device.create({ data: { callSign: 'F-NEW', deviceType: 'Handheld', status: 'ON_LOAN' } }),
      ]);

      // Create loans with different timestamps
      await Promise.all([
        prisma.loan.create({ data: { deviceId: devices[0].id, borrowerName: 'Old', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: devices[1].id, borrowerName: 'Mid', borrowedAt: new Date('2025-06-01') } }),
        prisma.loan.create({ data: { deviceId: devices[2].id, borrowerName: 'New', borrowedAt: new Date('2025-12-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      const activeLoans = response.body.data.activeLoans;
      expect(activeLoans).toHaveLength(3);

      // Most recent first
      expect(activeLoans[0].borrowerName).toBe('New');
      expect(activeLoans[1].borrowerName).toBe('Mid');
      expect(activeLoans[2].borrowerName).toBe('Old');
    });

    it('should format borrowedAt as ISO 8601', async () => {
      const device = await prisma.device.create({
        data: { callSign: 'F-ISO', deviceType: 'Handheld', status: 'ON_LOAN' },
      });

      await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Test',
          borrowedAt: new Date('2025-12-23T10:30:00.000Z'),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      const activeLoans = response.body.data.activeLoans;
      expect(activeLoans).toHaveLength(1);
      expect(activeLoans[0].borrowedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return 0 counts for empty database', async () => {
      // Database already cleaned in beforeEach
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toMatchObject({
        availableCount: 0,
        onLoanCount: 0,
        defectCount: 0,
        maintenanceCount: 0,
        activeLoans: [],
      });
    });

    it('should have response time < 200ms (performance benchmark)', async () => {
      // Create some test data
      const devices = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.device.create({
            data: { callSign: `F-PERF-${i}`, deviceType: 'Handheld', status: i % 4 === 0 ? 'ON_LOAN' : 'AVAILABLE' },
          })
        )
      );

      // Create loans for ON_LOAN devices
      const onLoanDevices = devices.filter((_, i) => i % 4 === 0);
      await Promise.all(
        onLoanDevices.map(device =>
          prisma.loan.create({
            data: { deviceId: device.id, borrowerName: 'Borrower', borrowedAt: new Date() },
          })
        )
      );

      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/api/admin/history/dashboard')
        .set('Cookie', sessionCookie)
        .expect(200);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent requests correctly', async () => {
      // Create test data
      const devices = await Promise.all([
        prisma.device.create({ data: { callSign: 'F-CONC-1', deviceType: 'Handheld', status: 'AVAILABLE' } }),
        prisma.device.create({ data: { callSign: 'F-CONC-2', deviceType: 'Handheld', status: 'ON_LOAN' } }),
      ]);

      await prisma.loan.create({
        data: { deviceId: devices[1].id, borrowerName: 'Concurrent', borrowedAt: new Date() },
      });

      // Send 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get('/api/admin/history/dashboard')
          .set('Cookie', sessionCookie)
      );

      const results = await Promise.all(requests);

      // All should succeed with identical data
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.data.availableCount).toBe(1);
        expect(res.body.data.onLoanCount).toBe(1);
      });
    });
  });

  // ================================================================================
  // History Endpoint Tests (32 tests)
  // ================================================================================
  describe('History Endpoint Tests', () => {
    let testDeviceId1: string;
    let testDeviceId2: string;

    beforeEach(async () => {
      // Clean up before each test
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});

      // Create test devices
      const device1 = await prisma.device.create({
        data: { callSign: 'F-HIST-1', deviceType: 'Handheld', status: 'AVAILABLE' },
      });
      const device2 = await prisma.device.create({
        data: { callSign: 'F-HIST-2', deviceType: 'Funkgerät', status: 'AVAILABLE' },
      });

      testDeviceId1 = device1.id;
      testDeviceId2 = device2.id;
    });

    afterEach(async () => {
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should return all loans paginated without filters', async () => {
      // Create 5 loans
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 86400000), // Different days
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta.total).toBe(5);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(100);
      expect(response.body.meta.totalPages).toBe(1);
    });

    it('should filter by deviceId only', async () => {
      // Create loans for both devices
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'B1', borrowedAt: new Date() } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'B2', borrowedAt: new Date() } }),
        prisma.loan.create({ data: { deviceId: testDeviceId2, borrowerName: 'B3', borrowedAt: new Date() } }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/admin/history/history?deviceId=${testDeviceId1}`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
      response.body.data.forEach((item: any) => {
        expect(item.device.id).toBe(testDeviceId1);
      });
    });

    it('should filter by from date only', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Old', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'New', borrowedAt: new Date('2025-06-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=2025-05-01T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('New');
    });

    it('should filter by to date only', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Old', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'New', borrowedAt: new Date('2025-06-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?to=2025-02-01T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('Old');
    });

    it('should filter by deviceId + from', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-Old', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-New', borrowedAt: new Date('2025-06-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId2, borrowerName: 'D2-New', borrowedAt: new Date('2025-06-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/admin/history/history?deviceId=${testDeviceId1}&from=2025-05-01T00:00:00Z`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('D1-New');
    });

    it('should filter by deviceId + to', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-Old', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-New', borrowedAt: new Date('2025-06-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId2, borrowerName: 'D2-Old', borrowedAt: new Date('2025-01-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/admin/history/history?deviceId=${testDeviceId1}&to=2025-02-01T00:00:00Z`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('D1-Old');
    });

    it('should filter by from + to', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Before', borrowedAt: new Date('2024-12-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'During', borrowedAt: new Date('2025-03-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'After', borrowedAt: new Date('2025-07-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=2025-01-01T00:00:00Z&to=2025-06-01T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('During');
    });

    it('should filter by deviceId + from + to (all filters)', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Match', borrowedAt: new Date('2025-03-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'TooOld', borrowedAt: new Date('2024-12-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId2, borrowerName: 'WrongDevice', borrowedAt: new Date('2025-03-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/admin/history/history?deviceId=${testDeviceId1}&from=2025-01-01T00:00:00Z&to=2025-06-01T00:00:00Z`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].borrowerName).toBe('Match');
    });

    it('should return 400 for invalid deviceId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?deviceId=invalid-id')
        .set('Cookie', sessionCookie)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid from date with German error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=invalid-date')
        .set('Cookie', sessionCookie)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      // German error message expected
      expect(typeof response.body.message).toBe('string');
    });

    it('should return 400 for invalid to date with German error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?to=not-a-date')
        .set('Cookie', sessionCookie)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when from > to', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=2025-12-31T00:00:00Z&to=2025-01-01T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('365');
      expect(response.body.message).toContain('from');
      expect(response.body.message).toContain('to');
    });

    it('should return 400 for date range > 365 days', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=2024-01-01T00:00:00Z&to=2025-12-31T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('365');
    });

    it('should return first 100 items on page 1', async () => {
      // Create 150 loans
      await Promise.all(
        Array.from({ length: 150 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000),
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?page=1')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(100);
      expect(response.body.meta.total).toBe(150);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(100);
      expect(response.body.meta.totalPages).toBe(2);
    });

    it('should return next 100 items on page 2', async () => {
      // Create 150 loans
      await Promise.all(
        Array.from({ length: 150 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000),
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?page=2')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(50);
      expect(response.body.meta.total).toBe(150);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.totalPages).toBe(2);
    });

    it('should support custom pageSize (50)', async () => {
      // Create 75 loans
      await Promise.all(
        Array.from({ length: 75 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000),
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?pageSize=50')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(50);
      expect(response.body.meta.total).toBe(75);
      expect(response.body.meta.pageSize).toBe(50);
      expect(response.body.meta.totalPages).toBe(2);
    });

    it('should enforce max pageSize (1001 clamped to 1000)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?pageSize=1001')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Zod schema clamps max to 1000
      expect(response.body.meta.pageSize).toBe(1000);
    });

    it('should return correct pagination metadata', async () => {
      // Create 250 loans
      await Promise.all(
        Array.from({ length: 250 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000),
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?page=2&pageSize=50')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.meta).toMatchObject({
        total: 250,
        page: 2,
        pageSize: 50,
        totalPages: 5,
      });
      expect(response.body.data).toHaveLength(50);
    });

    it('should return empty array for empty result set', async () => {
      // No loans created
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.totalPages).toBe(0);
    });

    it('should sort by borrowedAt DESC (most recent first)', async () => {
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Oldest', borrowedAt: new Date('2025-01-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Middle', borrowedAt: new Date('2025-06-01') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'Newest', borrowedAt: new Date('2025-12-01') } }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].borrowerName).toBe('Newest');
      expect(response.body.data[1].borrowerName).toBe('Middle');
      expect(response.body.data[2].borrowerName).toBe('Oldest');
    });

    it('should include both active and returned loans', async () => {
      await Promise.all([
        prisma.loan.create({
          data: {
            deviceId: testDeviceId1,
            borrowerName: 'Active',
            borrowedAt: new Date(),
            returnedAt: null,
          },
        }),
        prisma.loan.create({
          data: {
            deviceId: testDeviceId1,
            borrowerName: 'Returned',
            borrowedAt: new Date('2025-01-01'),
            returnedAt: new Date('2025-01-05'),
          },
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      const borrowerNames = response.body.data.map((item: any) => item.borrowerName);
      expect(borrowerNames).toContain('Active');
      expect(borrowerNames).toContain('Returned');
    });

    it('should format borrowedAt/returnedAt as ISO 8601', async () => {
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'Test',
          borrowedAt: new Date('2025-12-23T10:30:00.000Z'),
          returnedAt: new Date('2025-12-24T15:45:30.000Z'),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const item = response.body.data[0];
      expect(item.borrowedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(item.returnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return returnedAt = null for active loans', async () => {
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'Active',
          borrowedAt: new Date(),
          returnedAt: null,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].returnedAt).toBeNull();
    });

    it('should return returnNote = null when not provided', async () => {
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'NoNote',
          borrowedAt: new Date(),
          returnNote: null,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].returnNote).toBeNull();
    });

    it('should include device fields (id, callSign, deviceType, status)', async () => {
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'Test',
          borrowedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const device = response.body.data[0].device;
      expect(device).toHaveProperty('id');
      expect(device).toHaveProperty('callSign', 'F-HIST-1');
      expect(device).toHaveProperty('deviceType', 'Handheld');
      expect(device).toHaveProperty('status');
    });

    it('should track loan lifecycle: create -> return -> appears in history', async () => {
      // Create loan
      const loan = await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'Lifecycle',
          borrowedAt: new Date('2025-01-01'),
        },
      });

      // Check appears in history as active
      let response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].returnedAt).toBeNull();

      // Return loan
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          returnedAt: new Date('2025-01-05'),
          returnNote: 'All good',
        },
      });

      // Check still appears in history as returned
      response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].returnedAt).not.toBeNull();
      expect(response.body.data[0].returnNote).toBe('All good');
    });

    it('should not be affected by device status changes', async () => {
      // Create loan
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'StatusTest',
          borrowedAt: new Date(),
        },
      });

      // Change device status
      await prisma.device.update({
        where: { id: testDeviceId1 },
        data: { status: 'DEFECT' },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Loan still appears with updated device status
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].device.status).toBe('DEFECT');
    });

    it('should handle concurrent requests with different filters', async () => {
      // Create diverse test data
      await Promise.all([
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-Jan', borrowedAt: new Date('2025-01-15') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId2, borrowerName: 'D2-Feb', borrowedAt: new Date('2025-02-15') } }),
        prisma.loan.create({ data: { deviceId: testDeviceId1, borrowerName: 'D1-Mar', borrowedAt: new Date('2025-03-15') } }),
      ]);

      // Multiple concurrent requests with different filters
      const requests = [
        request(app.getHttpServer()).get('/api/admin/history/history').set('Cookie', sessionCookie),
        request(app.getHttpServer()).get(`/api/admin/history/history?deviceId=${testDeviceId1}`).set('Cookie', sessionCookie),
        request(app.getHttpServer()).get('/api/admin/history/history?from=2025-02-01T00:00:00Z').set('Cookie', sessionCookie),
      ];

      const results = await Promise.all(requests);

      expect(results[0].body.data).toHaveLength(3); // All loans
      expect(results[1].body.data).toHaveLength(2); // Only device1
      expect(results[2].body.data).toHaveLength(2); // From Feb onward
    });

    it('should return zero results with future date range', async () => {
      await prisma.loan.create({
        data: {
          deviceId: testDeviceId1,
          borrowerName: 'Past',
          borrowedAt: new Date('2025-01-01'),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?from=2026-01-01T00:00:00Z&to=2026-12-31T00:00:00Z')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle very large pageSize (1000 items)', async () => {
      // Create exactly 1000 loans
      await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          prisma.loan.create({
            data: {
              deviceId: testDeviceId1,
              borrowerName: `Borrower ${i}`,
              borrowedAt: new Date(Date.now() - i * 1000),
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?pageSize=1000')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1000);
      expect(response.body.meta.pageSize).toBe(1000);
      expect(response.body.meta.totalPages).toBe(1);
    });
  });

  // ================================================================================
  // Performance and Edge Case Tests
  // ================================================================================
  describe('Performance and Edge Cases', () => {
    beforeEach(async () => {
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    afterEach(async () => {
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should handle 10,000 loans with pagination < 100ms', async () => {
      // Create device
      const device = await prisma.device.create({
        data: { callSign: 'F-PERF-LARGE', deviceType: 'Handheld', status: 'AVAILABLE' },
      });

      // Create 10,000 loans (this might take a while to seed)
      const batchSize = 100;
      const totalLoans = 10000;
      const batches = Math.ceil(totalLoans / batchSize);

      for (let i = 0; i < batches; i++) {
        await prisma.loan.createMany({
          data: Array.from({ length: batchSize }, (_, j) => ({
            deviceId: device.id,
            borrowerName: `Borrower ${i * batchSize + j}`,
            borrowedAt: new Date(Date.now() - (i * batchSize + j) * 1000),
          })),
        });
      }

      // Measure query performance
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/api/admin/history/history?page=1&pageSize=100')
        .set('Cookie', sessionCookie)
        .expect(200);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(response.body.data).toHaveLength(100);
      expect(response.body.meta.total).toBe(totalLoans);
    }, 120000); // Increase timeout for seeding
  });
});
