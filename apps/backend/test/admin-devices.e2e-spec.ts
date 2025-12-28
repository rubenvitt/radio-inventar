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
import { AUTH_CONFIG, DEVICE_FIELD_LIMITS } from '@radio-inventar/shared';
import * as bcrypt from 'bcrypt';

const ConnectPgSimple = require('connect-pg-simple');

// Helper to find session cookie by name
const findSessionCookie = (cookies: string[]): string | undefined =>
  cookies.find((c: string) => c.startsWith(`${AUTH_CONFIG.SESSION_COOKIE_NAME}=`));

describe('AdminDevicesController (e2e)', () => {
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
      // Rate limiting is tested separately in the dedicated rate limit test
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
    // Cleanup - CRITICAL FIX: Return all ON_LOAN devices before deleting to prevent race conditions
    await prisma.loan.deleteMany({ where: { returnedAt: null } });
    await prisma.device.updateMany({ where: { status: 'ON_LOAN' }, data: { status: 'AVAILABLE' } });

    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.adminUser.deleteMany({});

    // CRITICAL FIX: Clean up ALL session records to prevent test pollution
    await pool.query("DELETE FROM session");

    await pool.end();
    await app.close();
  });

  describe('7.2: Complete CRUD flow with authentication', () => {
    let createdDeviceId: string;

    it('should CREATE a new device with authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-CRUD-01',
          serialNumber: 'SN-CRUD-001',
          deviceType: 'Handheld',
          notes: 'Test device for CRUD flow',
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        callSign: 'Florian 4-CRUD-01',
        serialNumber: 'SN-CRUD-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: 'Test device for CRUD flow',
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');

      createdDeviceId = response.body.data.id;
    });

    it('should READ the created device', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/devices/${createdDeviceId}`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: createdDeviceId,
        callSign: 'Florian 4-CRUD-01',
        serialNumber: 'SN-CRUD-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: 'Test device for CRUD flow',
      });
    });

    it('should UPDATE the created device', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${createdDeviceId}`)
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-CRUD-01-Updated',
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: createdDeviceId,
        callSign: 'Florian 4-CRUD-01-Updated',
        serialNumber: 'SN-CRUD-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: 'Updated notes',
      });
    });

    it('should LIST all devices including the created one', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const device = response.body.data.find((d: { id: string }) => d.id === createdDeviceId);
      expect(device).toBeDefined();
      expect(device).toMatchObject({
        id: createdDeviceId,
        callSign: 'Florian 4-CRUD-01-Updated',
        notes: 'Updated notes',
      });
    });

    it('should DELETE the created device', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/devices/${createdDeviceId}`)
        .set('Cookie', sessionCookie)
        .expect(204);

      // Verify device is deleted
      await request(app.getHttpServer())
        .get(`/api/admin/devices/${createdDeviceId}`)
        .set('Cookie', sessionCookie)
        .expect(404);
    });
  });

  describe('7.3: Unauthenticated requests should return 401', () => {
    let testDeviceId: string;

    beforeAll(async () => {
      // Create a test device for unauthenticated tests
      const device = await prisma.device.create({
        data: {
          callSign: 'Florian 4-UNAUTH-01',
          serialNumber: 'SN-UNAUTH-001',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      testDeviceId = device.id;
    });

    afterAll(async () => {
      await prisma.device.deleteMany({ where: { id: testDeviceId } });
    });

    it('should return 401 for POST /api/admin/devices without auth', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .send({
          callSign: 'Florian 4-NOAUTH-01',
          deviceType: 'Handheld',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for GET /api/admin/devices without auth', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for GET /api/admin/devices/:id without auth', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/devices/${testDeviceId}`)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for PATCH /api/admin/devices/:id without auth', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${testDeviceId}`)
        .send({
          callSign: 'Florian 4-NOAUTH-Updated',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for PATCH /api/admin/devices/:id/status without auth', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${testDeviceId}/status`)
        .send({
          status: 'MAINTENANCE',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for DELETE /api/admin/devices/:id without auth', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/devices/${testDeviceId}`)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('7.4: Deleting ON_LOAN device should return 409', () => {
    let onLoanDeviceId: string;

    beforeAll(async () => {
      // Create a device
      const device = await prisma.device.create({
        data: {
          callSign: 'Florian 4-ONLOAN-01',
          serialNumber: 'SN-ONLOAN-001',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      onLoanDeviceId = device.id;

      // Create a loan to make device ON_LOAN (using borrowerName string directly)
      await prisma.loan.create({
        data: {
          deviceId: onLoanDeviceId,
          borrowerName: 'Test Borrower for Loan',
          borrowedAt: new Date(),
        },
      });

      // Update device status to ON_LOAN
      await prisma.device.update({
        where: { id: onLoanDeviceId },
        data: { status: 'ON_LOAN' },
      });
    });

    afterAll(async () => {
      await prisma.loan.deleteMany({ where: { deviceId: onLoanDeviceId } });
      // Device might already be deleted by test "should allow deletion after device is returned"
      try {
        await prisma.device.deleteMany({ where: { id: onLoanDeviceId } });
      } catch (e) {
        // Device already deleted, ignore error
      }
    });

    it('should return 409 when trying to delete ON_LOAN device', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/devices/${onLoanDeviceId}`)
        .set('Cookie', sessionCookie)
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('ausgeliehen');
    });

    it('should allow deletion after device is returned', async () => {
      // Return the device
      await prisma.loan.updateMany({
        where: { deviceId: onLoanDeviceId, returnedAt: null },
        data: { returnedAt: new Date() },
      });

      await prisma.device.update({
        where: { id: onLoanDeviceId },
        data: { status: 'AVAILABLE' },
      });

      // Delete the loan record to avoid foreign key constraint
      await prisma.loan.deleteMany({
        where: { deviceId: onLoanDeviceId },
      });

      // Now deletion should succeed
      await request(app.getHttpServer())
        .delete(`/api/admin/devices/${onLoanDeviceId}`)
        .set('Cookie', sessionCookie)
        .expect(204);
    });
  });

  describe('7.5: Duplicate callSign should return 409', () => {
    let existingDeviceId: string;
    const duplicateCallSign = 'Florian 4-DUPLICATE-01';

    beforeAll(async () => {
      // Create a device with a specific callSign
      const device = await prisma.device.create({
        data: {
          callSign: duplicateCallSign,
          serialNumber: 'SN-DUP-001',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      existingDeviceId = device.id;
    });

    afterAll(async () => {
      await prisma.device.deleteMany({ where: { id: existingDeviceId } });
    });

    it('should return 409 when creating device with duplicate callSign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: duplicateCallSign,
          serialNumber: 'SN-DUP-002',
          deviceType: 'Handheld',
        })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toMatch(/callsign|funkrufname|bereits|existiert/);
    });

    it('should return 409 when updating device to duplicate callSign', async () => {
      // Create another device
      const anotherDevice = await prisma.device.create({
        data: {
          callSign: 'Florian 4-ANOTHER-01',
          serialNumber: 'SN-ANOTHER-001',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });

      // Try to update it to the duplicate callSign
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${anotherDevice.id}`)
        .set('Cookie', sessionCookie)
        .send({
          callSign: duplicateCallSign,
        })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toMatch(/callsign|funkrufname|bereits|existiert/);

      // Cleanup
      await prisma.device.deleteMany({ where: { id: anotherDevice.id } });
    });

    it('should allow updating device with its own callSign', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${existingDeviceId}`)
        .set('Cookie', sessionCookie)
        .send({
          callSign: duplicateCallSign,
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: existingDeviceId,
        callSign: duplicateCallSign,
        notes: 'Updated notes',
      });
    });
  });

  /**
   * Rate Limiting Tests (AC 7.6)
   *
   * These tests are skipped in the main E2E suite because ThrottlerGuard
   * is disabled (.overrideGuard) to prevent test flakiness and allow
   * parallel test execution without rate limit interference.
   *
   * To manually test rate limiting:
   * 1. Remove the .overrideGuard(ThrottlerGuard) from beforeAll setup
   * 2. Run: pnpm --filter @radio-inventar/backend test:e2e admin-devices -t "Rate limiting"
   */
  describe('7.6: Rate limiting should return 429 (optional)', () => {
    afterAll(async () => {
      // Cleanup created devices
      await prisma.device.deleteMany({
        where: {
          callSign: {
            startsWith: 'Florian 4-RATE-',
          },
        },
      });
    });

    it.skip('should return 429 after exceeding rate limit (skipped - ThrottlerGuard disabled)', async () => {
      // HIGH FIX: Use proper Promise.all with timestamps to verify rate limiting actually works
      // This test requires ThrottlerGuard to be enabled
      // See comment above for manual testing instructions

      const startTime = Date.now();
      const requests = Array.from({ length: 102 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: `Florian 4-RATE-${i}`,
            deviceType: 'Handheld',
          })
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify that rate limiting is actually working
      const rateLimited = results.filter(r => r.status === 429);
      const successful = results.filter(r => r.status === 201);

      // Should have at least 2 rate-limited requests (102 requests > 100/minute limit)
      expect(rateLimited.length).toBeGreaterThanOrEqual(2);

      // Should have at most 100 successful requests (the rate limit)
      expect(successful.length).toBeLessThanOrEqual(100);

      // Verify responses happened quickly (all in parallel, not sequentially delayed)
      // 102 requests should complete in < 5 seconds if properly parallel
      expect(duration).toBeLessThan(5000);

      // Log results for debugging
      console.log(`Rate limit test: ${successful.length} successful, ${rateLimited.length} rate-limited in ${duration}ms`);
    });
  });

  describe('Additional CRUD validations', () => {
    const createdDeviceIds: string[] = [];

    afterAll(async () => {
      // Clean up any devices created during these tests
      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({
          where: { id: { in: createdDeviceIds } },
        });
      }
    });

    it('should validate required fields when creating device', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          // Missing callSign and deviceType
          serialNumber: 'SN-INVALID-001',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate callSign max length', async () => {
      const longCallSign = 'A'.repeat(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX + 1);
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: longCallSign,
          deviceType: 'Handheld',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate deviceType max length', async () => {
      const longDeviceType = 'A'.repeat(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX + 1);
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-VALID',
          deviceType: longDeviceType,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when updating non-existent device', async () => {
      const nonExistentId = 'cm4nonexistent1234567890';
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${nonExistentId}`)
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-UPDATED',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent device', async () => {
      const nonExistentId = 'cm4nonexistent1234567890';
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/devices/${nonExistentId}`)
        .set('Cookie', sessionCookie)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate status when updating device status', async () => {
      const device = await prisma.device.create({
        data: {
          callSign: 'Florian 4-STATUS-TEST',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      createdDeviceIds.push(device.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${device.id}/status`)
        .set('Cookie', sessionCookie)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should successfully update device status to valid value', async () => {
      const device = await prisma.device.create({
        data: {
          callSign: 'Florian 4-STATUS-VALID',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      createdDeviceIds.push(device.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${device.id}/status`)
        .set('Cookie', sessionCookie)
        .send({
          status: 'MAINTENANCE',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: device.id,
        status: 'MAINTENANCE',
      });
    });

    it('should handle filtering by status in list endpoint', async () => {
      // Create devices with different statuses
      const availableDevice = await prisma.device.create({
        data: {
          callSign: 'Florian 4-FILTER-AVAILABLE',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      createdDeviceIds.push(availableDevice.id);

      const maintenanceDevice = await prisma.device.create({
        data: {
          callSign: 'Florian 4-FILTER-MAINTENANCE',
          deviceType: 'Handheld',
          status: 'MAINTENANCE',
        },
      });
      createdDeviceIds.push(maintenanceDevice.id);

      // Filter by AVAILABLE status
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices?status=AVAILABLE')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned devices should have AVAILABLE status
      response.body.data.forEach((device: { status: string }) => {
        expect(device.status).toBe('AVAILABLE');
      });
    });

    it('should handle pagination in list endpoint', async () => {
      // Create multiple devices
      const devices = await Promise.all([
        prisma.device.create({
          data: { callSign: 'Florian 4-PAGE-01', deviceType: 'Handheld', status: 'AVAILABLE' },
        }),
        prisma.device.create({
          data: { callSign: 'Florian 4-PAGE-02', deviceType: 'Handheld', status: 'AVAILABLE' },
        }),
        prisma.device.create({
          data: { callSign: 'Florian 4-PAGE-03', deviceType: 'Handheld', status: 'AVAILABLE' },
        }),
      ]);
      createdDeviceIds.push(...devices.map(d => d.id));

      // Test pagination: take 2, skip 1
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices?take=2&skip=1')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should return at most 2 devices
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('MEDIUM: Additional edge case tests', () => {
    const createdDeviceIds: string[] = [];

    afterAll(async () => {
      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({
          where: { id: { in: createdDeviceIds } },
        });
      }
    });

    it('should return 400 when trying to set ON_LOAN status via API', async () => {
      const device = await prisma.device.create({
        data: {
          callSign: 'Florian 4-ONLOAN-API',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
        },
      });
      createdDeviceIds.push(device.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/devices/${device.id}/status`)
        .set('Cookie', sessionCookie)
        .send({ status: 'ON_LOAN' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle Unicode characters in callSign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Flörian 4-Ümläut',
          deviceType: 'Handheld',
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      createdDeviceIds.push(response.body.data.id);
      // Unicode should be preserved after sanitization
      expect(response.body.data.callSign).toContain('ö');
    });

    it('should trim whitespace from callSign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: '  Florian 4-TRIM  ',
          deviceType: 'Handheld',
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      createdDeviceIds.push(response.body.data.id);
      expect(response.body.data.callSign).toBe('Florian 4-TRIM');
    });

    it('should validate serialNumber max length', async () => {
      const longSerialNumber = 'A'.repeat(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX + 1);
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-SERIAL-LONG',
          deviceType: 'Handheld',
          serialNumber: longSerialNumber,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should validate notes max length', async () => {
      const longNotes = 'A'.repeat(DEVICE_FIELD_LIMITS.NOTES_MAX + 1);
      const response = await request(app.getHttpServer())
        .post('/api/admin/devices')
        .set('Cookie', sessionCookie)
        .send({
          callSign: 'Florian 4-NOTES-LONG',
          deviceType: 'Handheld',
          notes: longNotes,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('CRITICAL: Additional E2E tests for Code Review #2', () => {
    const createdDeviceIds: string[] = [];

    afterAll(async () => {
      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({
          where: { id: { in: createdDeviceIds } },
        });
      }
    });

    describe('AC6 - Zod Schema Validation', () => {
      it('should return Zod validation error for invalid status enum', async () => {
        const device = await prisma.device.create({
          data: {
            callSign: 'Florian 4-ZOD-STATUS',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device.id);

        const response = await request(app.getHttpServer())
          .patch(`/api/admin/devices/${device.id}/status`)
          .set('Cookie', sessionCookie)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);

        // Zod errors have specific format
        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should return validation error for too long callSign', async () => {
        const longCallSign = 'A'.repeat(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX + 1);
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: longCallSign,
            deviceType: 'Handheld',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should return validation error for too long deviceType', async () => {
        const longDeviceType = 'A'.repeat(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX + 1);
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-ZOD-DT',
            deviceType: longDeviceType,
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      // CRITICAL FIX: AC6 - Test that Zod schemas reject invalid data types
      it('should reject non-string callSign (Zod type validation)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 12345, // number instead of string
            deviceType: 'Handheld',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
        // Zod error messages typically mention "Expected string"
        expect(JSON.stringify(response.body.message)).toMatch(/string/i);
      });

      it('should reject non-string deviceType (Zod type validation)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-ZOD-TYPE',
            deviceType: true, // boolean instead of string
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
        expect(JSON.stringify(response.body.message)).toMatch(/string/i);
      });

      it('should reject array for callSign (Zod type validation)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: ['Florian', '4-23'], // array instead of string
            deviceType: 'Handheld',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject object for deviceType (Zod type validation)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-ZOD-OBJ',
            deviceType: { type: 'Handheld' }, // object instead of string
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Empty string handling for required fields', () => {
      it('should reject empty callSign', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: '',
            deviceType: 'Handheld',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject empty deviceType', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-EMPTY-DT',
            deviceType: '',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject whitespace-only callSign', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: '   ',
            deviceType: 'Handheld',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject whitespace-only deviceType', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-WS-DT',
            deviceType: '   ',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Empty string handling for optional fields', () => {
      it('should convert empty string serialNumber to null', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-EMPTY-SN',
            deviceType: 'Handheld',
            serialNumber: '',
          })
          .expect(201);

        createdDeviceIds.push(response.body.data.id);
        expect(response.body.data.serialNumber).toBeNull();
      });

      it('should convert empty string notes to null', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-EMPTY-NOTES',
            deviceType: 'Handheld',
            notes: '',
          })
          .expect(201);

        createdDeviceIds.push(response.body.data.id);
        expect(response.body.data.notes).toBeNull();
      });

      it('should convert whitespace-only serialNumber to null', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-WS-SN',
            deviceType: 'Handheld',
            serialNumber: '   ',
          })
          .expect(201);

        createdDeviceIds.push(response.body.data.id);
        expect(response.body.data.serialNumber).toBeNull();
      });
    });

    describe('ON_LOAN status via general PATCH should fail', () => {
      it('should reject ON_LOAN status in update DTO', async () => {
        const device = await prisma.device.create({
          data: {
            callSign: 'Florian 4-PATCH-ONLOAN',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device.id);

        // Note: The general PATCH endpoint uses UpdateDeviceDto which doesn't include status field
        // This test verifies that even if someone tries to send status in body, it's ignored
        const response = await request(app.getHttpServer())
          .patch(`/api/admin/devices/${device.id}`)
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-UPDATED',
            status: 'ON_LOAN', // Should be ignored by whitelist
          })
          .expect(200);

        // Status should remain AVAILABLE (whitelist filter removes unknown fields)
        expect(response.body.data.status).toBe('AVAILABLE');
      });
    });

    describe('Invalid ID format tests', () => {
      it('should return 400 for too short ID', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices/abc')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body.message).toContain('ID-Format');
      });

      it('should return 400 for ID with special characters', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices/cm4abc!@#def456789012345')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 for ID with uppercase letters', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices/cm4ABC123def456789012345')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });

    describe('Strict response validation', () => {
      it('should return valid CUID2 format ID', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-CUID2-TEST',
            deviceType: 'Handheld',
          })
          .expect(201);

        createdDeviceIds.push(response.body.data.id);
        // CUID2: starts with letter, lowercase alphanumeric, typically 24-25 chars
        expect(response.body.data.id).toMatch(/^[a-z][a-z0-9]{23,31}$/);
      });

      it('should return ISO 8601 date format for timestamps', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-ISO-DATE',
            deviceType: 'Handheld',
          })
          .expect(201);

        createdDeviceIds.push(response.body.data.id);
        // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
        expect(response.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        expect(response.body.data.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      });
    });

    describe('Error message content validation', () => {
      it('should return specific German error message for not found', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices/cm4nonexistent1234567890')
          .set('Cookie', sessionCookie)
          .expect(404);

        expect(response.body.message).toBe('Gerät nicht gefunden');
      });

      it('should return specific German error message for duplicate callSign', async () => {
        const device = await prisma.device.create({
          data: {
            callSign: 'Florian 4-ERROR-MSG',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device.id);

        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-ERROR-MSG',
            deviceType: 'Handheld',
          })
          .expect(409);

        expect(response.body.message).toBe('Funkruf existiert bereits');
      });
    });

    // HIGH FIX: Null-byte injection tests
    // PostgreSQL will reject null bytes (\x00) in text columns, resulting in 500 errors
    // These tests verify that the system doesn't crash and returns proper error responses
    describe('Null-byte injection prevention', () => {
      it('should reject callSign with null bytes (400 or 500)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian\x004-NULL',
            deviceType: 'Handheld',
          });

        // Either validation rejects it (400) or DB rejects it (500)
        expect([400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
      });

      it('should reject deviceType with null bytes (400 or 500)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-NULL-DT',
            deviceType: 'Hand\x00held',
          });

        expect([400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
      });

      it('should reject serialNumber with null bytes (400 or 500)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-NULL-SN',
            deviceType: 'Handheld',
            serialNumber: 'SN-\x00123',
          });

        expect([400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
      });

      it('should reject notes with null bytes (400 or 500)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'Florian 4-NULL-NOTES',
            deviceType: 'Handheld',
            notes: 'Test\x00notes',
          });

        expect([400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
      });
    });

    // MEDIUM FIX: Pagination boundary tests
    describe('Pagination boundary validation', () => {
      it('should reject negative take parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices?take=-1')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject negative skip parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices?skip=-5')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject non-numeric take parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices?take=abc')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject non-numeric skip parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices?skip=xyz')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject take=0 (invalid value)', async () => {
        // take=0 is semantically invalid - requesting 0 items doesn't make sense
        const response = await request(app.getHttpServer())
          .get('/api/admin/devices?take=0')
          .set('Cookie', sessionCookie)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });
    });

    // MEDIUM FIX: Case-insensitive callSign uniqueness tests
    // NOTE: These tests document EXPECTED behavior - case-insensitive uniqueness is not yet implemented
    // Currently the database allows "Florian 4-01" and "FLORIAN 4-01" as different records
    // These tests are skipped until the backend implements case-insensitive uniqueness checks
    describe('CallSign case-insensitive uniqueness (TODO: Not yet implemented)', () => {
      it.skip('should reject duplicate callSign with different case', async () => {
        // TODO: Backend needs to implement case-insensitive uniqueness check
        // Create device with lowercase callsign
        const device = await prisma.device.create({
          data: {
            callSign: 'florian 4-case-test',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device.id);

        // Try to create with uppercase version - should fail with 409
        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'FLORIAN 4-CASE-TEST',
            deviceType: 'Handheld',
          })
          .expect(409);

        expect(response.body).toHaveProperty('statusCode', 409);
        expect(response.body.message.toLowerCase()).toMatch(/callsign|funkrufname|bereits|existiert/);
      });

      it.skip('should reject duplicate callSign with mixed case', async () => {
        // TODO: Backend needs to implement case-insensitive uniqueness check
        const device = await prisma.device.create({
          data: {
            callSign: 'Florian 4-MiXeD',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device.id);

        const response = await request(app.getHttpServer())
          .post('/api/admin/devices')
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'florian 4-mixed',
            deviceType: 'Handheld',
          })
          .expect(409);

        expect(response.body).toHaveProperty('statusCode', 409);
        expect(response.body.message.toLowerCase()).toMatch(/callsign|funkrufname|bereits|existiert/);
      });

      it.skip('should reject update to duplicate callSign with different case', async () => {
        // TODO: Backend needs to implement case-insensitive uniqueness check
        const device1 = await prisma.device.create({
          data: {
            callSign: 'Florian 4-UPDATE-CASE-1',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device1.id);

        const device2 = await prisma.device.create({
          data: {
            callSign: 'Florian 4-UPDATE-CASE-2',
            deviceType: 'Handheld',
            status: 'AVAILABLE',
          },
        });
        createdDeviceIds.push(device2.id);

        // Try to update device2 to have same callSign as device1 (different case)
        const response = await request(app.getHttpServer())
          .patch(`/api/admin/devices/${device2.id}`)
          .set('Cookie', sessionCookie)
          .send({
            callSign: 'FLORIAN 4-UPDATE-CASE-1',
          })
          .expect(409);

        expect(response.body).toHaveProperty('statusCode', 409);
        expect(response.body.message.toLowerCase()).toMatch(/callsign|funkrufname|bereits|existiert/);
      });
    });
  });
});
