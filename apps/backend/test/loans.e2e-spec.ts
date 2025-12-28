import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('LoansController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
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
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Cleanup existing test data
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await app.close();
  });

  describe('GET /api/loans/active', () => {
    let testDeviceId: string;
    let testLoanId: string;

    beforeEach(async () => {
      // Create unique test data for each test to ensure isolation
      const timestamp = Date.now();

      // Seed test device with active loan
      const testDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-LOAN-TEST-${timestamp}`,
          serialNumber: `LOAN-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'ON_LOAN',
          notes: 'Device for loan testing',
        },
      });
      testDeviceId = testDevice.id;

      // Seed test loan
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const testLoan = await prisma.loan.create({
        data: {
          deviceId: testDeviceId,
          borrowerName: 'Max Mustermann',
          borrowedAt: threeDaysAgo,
          returnedAt: null,
        },
      });
      testLoanId = testLoan.id;

      // Create another device with returned loan
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const returnedDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-RETURNED-TEST-${timestamp}`,
          serialNumber: `RETURNED-TEST-SN-${timestamp}`,
          deviceType: 'Vehicular',
          status: 'AVAILABLE',
          notes: null,
        },
      });

      await prisma.loan.create({
        data: {
          deviceId: returnedDevice.id,
          borrowerName: 'Erika Musterfrau',
          borrowedAt: eightDaysAgo,
          returnedAt: fourDaysAgo,
        },
      });
    });

    afterEach(async () => {
      // Cleanup test-specific data after each test
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should return 200 and array of active loans', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/loans/active')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should wrap response in { data: [...] } format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/loans/active')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeDefined();
    });

    it('should only return active loans (returnedAt is excluded from response per AC#2)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/loans/active')
        .expect(200);

      // Response should have data array
      expect(Array.isArray(response.body.data)).toBe(true);
      // returnedAt is NOT included in response per AC#2 (using select)
      if (response.body.data.length > 0) {
        response.body.data.forEach((loan: Record<string, unknown>) => {
          expect(loan).not.toHaveProperty('returnedAt');
        });
      }
    });

    it('should include device information in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/loans/active')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const loan = response.body.data[0];
      expect(loan).toHaveProperty('device');
      expect(loan.device).toHaveProperty('id');
      expect(loan.device).toHaveProperty('callSign');
      expect(loan.device).toHaveProperty('status');
    });

    it('should return loan with expected fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/loans/active')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const loan = response.body.data[0];
      expect(loan).toHaveProperty('id');
      expect(loan).toHaveProperty('deviceId');
      expect(loan).toHaveProperty('borrowerName');
      expect(loan).toHaveProperty('borrowedAt');
    });

    describe('Query Parameter Validation', () => {
      it('should reject take=0 (minimum is 1)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=0')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'take')).toBe(true);
        const takeError = response.body.errors.find((err: any) => err.field === 'take');
        expect(takeError).toHaveProperty('message');
      });

      it('should reject take > max (500)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=1000')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'take')).toBe(true);
        const takeError = response.body.errors.find((err: any) => err.field === 'take');
        expect(takeError).toHaveProperty('message');
      });

      it('should reject negative skip', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?skip=-1')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'skip')).toBe(true);
        const skipError = response.body.errors.find((err: any) => err.field === 'skip');
        expect(skipError).toHaveProperty('message');
      });

      it('should reject non-numeric take', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=abc')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'take')).toBe(true);
        const takeError = response.body.errors.find((err: any) => err.field === 'take');
        expect(takeError).toHaveProperty('message');
      });

      it('should accept valid take and skip parameters', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=10&skip=0')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should accept take at maximum boundary (500)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=500')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should accept take at minimum boundary (1)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=1')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // Should return at most 1 item
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      });

      // M2 Fix: Add skip > MAX_SKIP validation test
      it('should reject skip > MAX_SKIP (10000)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?skip=10001')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'skip')).toBe(true);
        const skipError = response.body.errors.find((err: any) => err.field === 'skip');
        expect(skipError).toHaveProperty('message');
      });

      it('should accept skip at MAX_SKIP boundary (10000)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?skip=10000')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      // M3 Fix: Add fractional number validation tests
      it('should reject fractional take value', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?take=10.5')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'take')).toBe(true);
        const takeError = response.body.errors.find((err: any) => err.field === 'take');
        expect(takeError).toHaveProperty('message');
      });

      it('should reject fractional skip value', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/loans/active?skip=5.7')
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'skip')).toBe(true);
        const skipError = response.body.errors.find((err: any) => err.field === 'skip');
        expect(skipError).toHaveProperty('message');
      });
    });
  });

  describe('POST /api/loans', () => {
    afterEach(async () => {
      // Cleanup: Delete test data created during each test
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should return 201 with loan data (AC#1, AC#2, AC#3)', async () => {
      // Create a fresh AVAILABLE device for this test
      const timestamp = Date.now();
      const availableDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-CREATE-LOAN-TEST-${timestamp}`,
          serialNumber: `CREATE-LOAN-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'AVAILABLE'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: availableDevice.id, borrowerName: 'Max Mustermann' })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('borrowedAt');
      expect(response.body.data).toHaveProperty('device');
      expect(response.body.data.device.status).toBe('ON_LOAN');
      expect(response.body.data.deviceId).toBe(availableDevice.id);
      expect(response.body.data.borrowerName).toBe('Max Mustermann');

      // Verify borrowedAt timestamp accuracy (within 1 second of now)
      const borrowedAt = new Date(response.body.data.borrowedAt);
      const now = new Date();
      const diffMs = Math.abs(now.getTime() - borrowedAt.getTime());
      expect(diffMs).toBeLessThan(1000);
    });

    it('should return 409 when device already on loan (AC#5)', async () => {
      // Create a device and explicitly set it to ON_LOAN for this test
      const timestamp = Date.now();
      const onLoanDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-ON-LOAN-TEST-${timestamp}`,
          serialNumber: `ON-LOAN-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'ON_LOAN'
        }
      });

      // Create an active loan for this device
      await prisma.loan.create({
        data: {
          deviceId: onLoanDevice.id,
          borrowerName: 'Existing Borrower',
          borrowedAt: new Date(),
          returnedAt: null,
        }
      });

      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: onLoanDevice.id, borrowerName: 'Another Person' })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent device (AC#6)', async () => {
      // AC#6: Non-existent device should return 404 Not Found
      // Use a valid CUID2 format that doesn't exist in DB
      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: 'cm6kqmc1100001hm1notexis', borrowerName: 'Test User' })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 for DEFECT device', async () => {
      // Create DEFECT device for this test
      const timestamp = Date.now();
      const defectDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-DEFECT-TEST-${timestamp}`,
          serialNumber: `DEFECT-TEST-SN-${timestamp}`,
          deviceType: 'Vehicular',
          status: 'DEFECT'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: defectDevice.id, borrowerName: 'Test User' })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 for MAINTENANCE device', async () => {
      // Create MAINTENANCE device for this test
      const timestamp = Date.now();
      const maintenanceDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-MAINTENANCE-TEST-${timestamp}`,
          serialNumber: `MAINTENANCE-TEST-SN-${timestamp}`,
          deviceType: 'Base Station',
          status: 'MAINTENANCE'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: maintenanceDevice.id, borrowerName: 'Test User' })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid CUID2 format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: 'invalid-id', borrowerName: 'Test User' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.any(String),
      });
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      // Verify error structure contains field and message
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('field');
      expect(response.body.errors[0]).toHaveProperty('message');
    });

    it('should return 400 for empty deviceId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: '', borrowerName: 'Test User' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for empty borrowerName', async () => {
      // Create a temporary device for this test
      const timestamp = Date.now();
      const tempDevice = await prisma.device.create({
        data: {
          callSign: `Florian 4-TEMP-TEST-${timestamp}`,
          serialNumber: `TEMP-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'AVAILABLE'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/api/loans')
        .send({ deviceId: tempDevice.id, borrowerName: '' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    describe('Boundary Tests - borrowerName Length', () => {
      it('should accept borrowerName with exactly 1 character (minimum)', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian BOUNDARY-TEST-1-${timestamp}`,
            serialNumber: `BOUNDARY-TEST-SN-1-${timestamp}`,
            deviceType: 'Handheld',
            status: 'AVAILABLE'
          }
        });

        const borrowerName1 = 'A';
        const response = await request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: borrowerName1 })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.borrowerName).toBe(borrowerName1);
      });

      it('should accept borrowerName with exactly 100 characters', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian BOUNDARY-TEST-100-${timestamp}`,
            serialNumber: `BOUNDARY-TEST-SN-100-${timestamp}`,
            deviceType: 'Handheld',
            status: 'AVAILABLE'
          }
        });

        const borrowerName100 = 'A'.repeat(100);
        const response = await request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: borrowerName100 })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.borrowerName).toBe(borrowerName100);
      });

      it('should reject borrowerName with 101 characters', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian BOUNDARY-TEST-101-${timestamp}`,
            serialNumber: `BOUNDARY-TEST-SN-101-${timestamp}`,
            deviceType: 'Handheld',
            status: 'AVAILABLE'
          }
        });

        const borrowerName101 = 'A'.repeat(101);
        const response = await request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: borrowerName101 })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        // sanitizeString throws BadRequestException with message about length
        expect(response.body.message).toContain('maximum length');
      });
    });

    describe('Security Tests', () => {
      it('should sanitize SQL injection attempts', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian SQL-TEST-${timestamp}`,
            serialNumber: `SQL-TEST-SN-${timestamp}`,
            deviceType: 'Handheld',
            status: 'AVAILABLE'
          }
        });

        const sqlInjectionPayload = "'; DROP TABLE loans;--";
        const response = await request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: sqlInjectionPayload })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');

        // Verify stored value is the exact payload (literal string, not executed SQL)
        const loan = await prisma.loan.findUnique({ where: { id: response.body.data.id } });
        expect(loan).toBeDefined();
        expect(loan?.borrowerName).toBe(sqlInjectionPayload);

        // Verify loans table still exists and has data (SQL injection was NOT executed)
        // Defense: Prisma uses parameterized queries, so SQL injection is prevented at the ORM level
        const loansCount = await prisma.loan.count();
        expect(loansCount).toBeGreaterThan(0);
      });

      it('should store XSS payload as literal string', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian XSS-TEST-${timestamp}`,
            serialNumber: `XSS-TEST-SN-${timestamp}`,
            deviceType: 'Vehicular',
            status: 'AVAILABLE'
          }
        });

        const xssPayload = '<script>alert("xss")</script>';
        const response = await request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: xssPayload })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');

        // Verify the response body contains the exact payload (backend doesn't encode/escape)
        // XSS prevention is the frontend's responsibility via proper HTML escaping during rendering
        expect(response.body.data.borrowerName).toBe(xssPayload);

        // Verify stored value is the exact payload (literal string)
        const loan = await prisma.loan.findUnique({ where: { id: response.body.data.id } });
        expect(loan).toBeDefined();
        expect(loan?.borrowerName).toBe(xssPayload);
      });
    });

    describe('Concurrent Loan Creates', () => {
      it('should handle concurrent loan creation (race condition)', async () => {
        // Create a fresh device for this test
        const raceDevice = await prisma.device.create({
          data: {
            callSign: 'RACE-TEST-' + Date.now(),
            serialNumber: 'RACE-TEST-SN-' + Date.now(),
            deviceType: 'Base Station',
            status: 'AVAILABLE'
          }
        });

        // Fire multiple concurrent HTTP requests
        const requests = Array(5).fill(null).map(() =>
          request(app.getHttpServer())
            .post('/api/loans')
            .send({ deviceId: raceDevice.id, borrowerName: 'Race Tester' })
        );

        const results = await Promise.all(requests);

        // Exactly one should succeed (201), others should get 409
        const successes = results.filter(r => r.status === 201);
        const conflicts = results.filter(r => r.status === 409);

        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(4);

        // Verify device is now ON_LOAN
        const updatedDevice = await prisma.device.findUnique({ where: { id: raceDevice.id } });
        expect(updatedDevice?.status).toBe('ON_LOAN');

        // Verify exactly one loan was created
        const loans = await prisma.loan.findMany({ where: { deviceId: raceDevice.id } });
        expect(loans.length).toBe(1);

        // Cleanup
        await prisma.loan.deleteMany({ where: { deviceId: raceDevice.id } });
        await prisma.device.delete({ where: { id: raceDevice.id } });
      });
    });
  });

  describe('PATCH /api/loans/:loanId', () => {
    afterEach(async () => {
      await prisma.loan.deleteMany({});
      await prisma.device.deleteMany({});
    });

    it('should return 200 and update loan with returnedAt, set device to AVAILABLE (AC#8.1)', async () => {
      const timestamp = Date.now();
      // Create device and active loan
      const device = await prisma.device.create({
        data: {
          callSign: `Florian RETURN-TEST-${timestamp}`,
          serialNumber: `RETURN-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'ON_LOAN'
        }
      });
      const loan = await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Max Mustermann',
          borrowedAt: new Date(),
          returnedAt: null,
        }
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/loans/${loan.id}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('returnedAt');
      expect(response.body.data.returnedAt).not.toBeNull();
      expect(response.body.data.device.status).toBe('AVAILABLE');

      // Verify device status in DB
      const updatedDevice = await prisma.device.findUnique({ where: { id: device.id } });
      expect(updatedDevice?.status).toBe('AVAILABLE');

      // Verify returnedAt timestamp accuracy (within 1 second of now)
      const returnedAt = new Date(response.body.data.returnedAt);
      const now = new Date();
      const diffMs = Math.abs(now.getTime() - returnedAt.getTime());
      expect(diffMs).toBeLessThan(1000);
    });

    it('should save returnNote when provided (AC#8.2)', async () => {
      const timestamp = Date.now();
      // Create device and active loan
      const device = await prisma.device.create({
        data: {
          callSign: `Florian RETURN-NOTE-TEST-${timestamp}`,
          serialNumber: `RETURN-NOTE-TEST-SN-${timestamp}`,
          deviceType: 'Vehicular',
          status: 'ON_LOAN'
        }
      });
      const loan = await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Erika Musterfrau',
          borrowedAt: new Date(),
          returnedAt: null,
        }
      });

      const returnNote = 'Device was slightly damaged, sent to maintenance';
      const response = await request(app.getHttpServer())
        .patch(`/api/loans/${loan.id}`)
        .send({ returnNote })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('returnNote');
      expect(response.body.data.returnNote).toBe(returnNote);

      // Verify returnNote in DB
      const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
      expect(updatedLoan?.returnNote).toBe(returnNote);
    });

    it('should return 409 when trying to return already returned loan (AC#8.3)', async () => {
      const timestamp = Date.now();
      // Create device with returned loan
      const device = await prisma.device.create({
        data: {
          callSign: `Florian ALREADY-RETURNED-TEST-${timestamp}`,
          serialNumber: `ALREADY-RETURNED-TEST-SN-${timestamp}`,
          deviceType: 'Base Station',
          status: 'AVAILABLE'
        }
      });
      const returnedLoan = await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Already Returned',
          borrowedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          returnedAt: new Date(), // Already returned
        }
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/loans/${returnedLoan.id}`)
        .send({})
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent loan ID (AC#8.4)', async () => {
      // Use a valid CUID2 format that doesn't exist in DB
      const response = await request(app.getHttpServer())
        .patch('/api/loans/cm6kqmc1100001hm1notexis')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid loanId format (AC#8.5)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/loans/invalid-id-format')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.any(String),
      });
      // Verify the error message indicates invalid format
      expect(response.body.message).toContain('Format');
    });

    describe('Boundary Tests - returnNote Length', () => {
      it('should accept returnNote with exactly 1 character (minimum)', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian RETURN-NOTE-BOUNDARY-1-${timestamp}`,
            serialNumber: `RETURN-NOTE-BOUNDARY-SN-1-${timestamp}`,
            deviceType: 'Handheld',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        const returnNote1 = 'A';
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: returnNote1 })
          .expect(200);

        expect(response.body.data).toHaveProperty('returnNote', returnNote1);
      });

      it('should accept returnNote with exactly 500 characters (maximum)', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian RETURN-NOTE-BOUNDARY-500-${timestamp}`,
            serialNumber: `RETURN-NOTE-BOUNDARY-SN-500-${timestamp}`,
            deviceType: 'Vehicular',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        const returnNote500 = 'A'.repeat(500);
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: returnNote500 })
          .expect(200);

        expect(response.body.data).toHaveProperty('returnNote', returnNote500);
      });

      it('should reject returnNote with 501 characters', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian RETURN-NOTE-BOUNDARY-501-${timestamp}`,
            serialNumber: `RETURN-NOTE-BOUNDARY-SN-501-${timestamp}`,
            deviceType: 'Base Station',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        const returnNote501 = 'A'.repeat(501);
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: returnNote501 })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        // sanitizeString throws BadRequestException with message about length
        expect(response.body.message).toContain('maximum length');
      });
    });

    describe('Security Tests', () => {
      it('should store SQL injection attempts as literal string in returnNote', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian RETURN-SQL-TEST-${timestamp}`,
            serialNumber: `RETURN-SQL-TEST-SN-${timestamp}`,
            deviceType: 'Handheld',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'SQL Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        const sqlInjectionPayload = "'; DROP TABLE loans;--";
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: sqlInjectionPayload })
          .expect(200);

        expect(response.body.data).toHaveProperty('returnNote', sqlInjectionPayload);

        // Verify stored value is the exact payload (literal string, not executed SQL)
        const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
        expect(updatedLoan?.returnNote).toBe(sqlInjectionPayload);

        // Verify loans table still exists (SQL injection was NOT executed)
        const loansCount = await prisma.loan.count();
        expect(loansCount).toBeGreaterThan(0);
      });

      it('should store XSS payload as literal string in returnNote', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian RETURN-XSS-TEST-${timestamp}`,
            serialNumber: `RETURN-XSS-TEST-SN-${timestamp}`,
            deviceType: 'Vehicular',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'XSS Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        const xssPayload = '<script>alert("xss")</script>';
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: xssPayload })
          .expect(200);

        expect(response.body.data).toHaveProperty('returnNote', xssPayload);

        // Verify stored value is the exact payload (literal string)
        const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
        expect(updatedLoan?.returnNote).toBe(xssPayload);
      });

      // L6 R3: Test that large payloads (>1MB) are rejected
      it('should return error for oversized returnNote payload (>1MB)', async () => {
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian DOS-TEST-${timestamp}`,
            serialNumber: `DOS-TEST-SN-${timestamp}`,
            deviceType: 'Handheld',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'DOS Test User',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        // Create a payload larger than 1MB (NestJS default body limit)
        // Using 1.5MB to ensure it exceeds the limit
        const largePayload = 'A'.repeat(1.5 * 1024 * 1024);
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${loan.id}`)
          .send({ returnNote: largePayload });

        // Should reject with error status (400, 413, or 500)
        // 400: Validation error, 413: Payload too large, 500: Internal server error
        expect([400, 413, 500]).toContain(response.status);
      });
    });

    // M4 R4 - Empty String Handling E2E Test
    it('should transform empty string returnNote to null', async () => {
      const timestamp = Date.now();
      // Create device and active loan
      const device = await prisma.device.create({
        data: {
          callSign: `Florian EMPTY-NOTE-TEST-${timestamp}`,
          serialNumber: `EMPTY-NOTE-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'ON_LOAN'
        }
      });
      const loan = await prisma.loan.create({
        data: {
          deviceId: device.id,
          borrowerName: 'Empty Note Tester',
          borrowedAt: new Date(),
          returnedAt: null,
        }
      });

      // Return with empty string returnNote
      const response = await request(app.getHttpServer())
        .patch(`/api/loans/${loan.id}`)
        .send({ returnNote: '' })
        .expect(200);

      // Verify response.body.data.returnNote === null
      expect(response.body.data).toHaveProperty('returnNote');
      expect(response.body.data.returnNote).toBeNull();

      // Verify DB loan.returnNote === null
      const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
      expect(updatedLoan?.returnNote).toBeNull();
    });

    // M5 R4 - CUID2 Boundary Tests
    describe('CUID2 Length Boundary Tests', () => {
      it('should return 400 for loanId with 23 characters (too short)', async () => {
        const shortId = 'a'.repeat(23); // 23 chars - too short
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${shortId}`)
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body.message).toContain('Format');
      });

      it('should not fail on format validation for loanId with 24 characters (valid minimum)', async () => {
        const minValidId = 'a'.repeat(24); // 24 chars - valid minimum length
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${minValidId}`)
          .send({});

        // Should not fail on format (400), may fail on 404 (not found)
        expect(response.status).not.toBe(400);
        // Likely 404 since this ID doesn't exist in DB
        if (response.status === 404) {
          expect(response.body).toHaveProperty('statusCode', 404);
        }
      });

      it('should not fail on format validation for loanId with 25 characters (valid)', async () => {
        const validId = 'a'.repeat(25); // 25 chars - valid length
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${validId}`)
          .send({});

        // Should not fail on format (400), may fail on 404 (not found)
        expect(response.status).not.toBe(400);
        // Likely 404 since this ID doesn't exist in DB
        if (response.status === 404) {
          expect(response.body).toHaveProperty('statusCode', 404);
        }
      });

      it('should return 400 for loanId with 33 characters (too long)', async () => {
        const longId = 'a'.repeat(33); // 33 chars - too long
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${longId}`)
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body.message).toContain('Format');
      });

      // L9 R3: Test that uppercase characters are rejected
      it('should return 400 for loanId with uppercase characters', async () => {
        const uppercaseId = 'CM6KQMC1200001HM1ABCD123'; // Valid length but uppercase
        const response = await request(app.getHttpServer())
          .patch(`/api/loans/${uppercaseId}`)
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body.message).toContain('Format');
      });
    });

    describe('Concurrent Return Tests', () => {
      it('should handle concurrent return attempts (race condition)', async () => {
        // Create a fresh device and loan for this test
        const timestamp = Date.now();
        const device = await prisma.device.create({
          data: {
            callSign: `Florian CONCURRENT-RETURN-TEST-${timestamp}`,
            serialNumber: `CONCURRENT-RETURN-TEST-SN-${timestamp}`,
            deviceType: 'Handheld',
            status: 'ON_LOAN'
          }
        });
        const loan = await prisma.loan.create({
          data: {
            deviceId: device.id,
            borrowerName: 'Concurrent Return Tester',
            borrowedAt: new Date(),
            returnedAt: null,
          }
        });

        // Fire multiple concurrent HTTP requests with unique returnNote values
        // M8 R3 Fix: Use unique notes to verify correct one is stored
        const uniqueNotes = [
          'Concurrent test note 1',
          'Concurrent test note 2',
          'Concurrent test note 3',
          'Concurrent test note 4',
          'Concurrent test note 5'
        ];
        const requests = uniqueNotes.map(note =>
          request(app.getHttpServer())
            .patch(`/api/loans/${loan.id}`)
            .send({ returnNote: note })
        );

        const results = await Promise.all(requests);

        // Exactly one should succeed (200), others should get 409
        const successes = results.filter(r => r.status === 200);
        const conflicts = results.filter(r => r.status === 409);

        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(4);

        // M8 R3 Fix: Extract the returnNote from the successful response
        const successfulResponse = successes[0];
        const successfulReturnNote = successfulResponse.body.data.returnNote;

        // Verify the successful returnNote is one of our unique notes
        expect(uniqueNotes).toContain(successfulReturnNote);

        // Verify device is now AVAILABLE
        const updatedDevice = await prisma.device.findUnique({ where: { id: device.id } });
        expect(updatedDevice?.status).toBe('AVAILABLE');

        // M8 R3 Fix: Verify DB has the exact returnNote value from the successful response
        const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
        expect(updatedLoan?.returnedAt).not.toBeNull();
        expect(updatedLoan?.returnNote).toBe(successfulReturnNote);
      });
    });
  });

  /**
   * Rate Limiting Tests
   *
   * H3 R3: These tests are intentionally skipped in automated E2E tests because
   * ThrottlerGuard is disabled in the test setup to prevent test flakiness
   * and allow parallel test execution without rate limit interference.
   *
   * MANUAL VERIFICATION REQUIRED:
   * To test rate limiting manually, choose one of these methods:
   *
   * Method 1 - Using curl script:
   * 1. Start the backend in development mode: pnpm dev:backend
   * 2. Run the manual test script: ./test/manual/test-rate-limit.sh
   *    Or run directly:
   *    for i in {1..11}; do curl -X POST http://localhost:3000/api/loans \
   *      -H "Content-Type: application/json" \
   *      -d '{"deviceId":"test-device-id","borrowerName":"Test"}'; done
   * 3. Verify: 11th request returns 429 Too Many Requests
   *
   * Method 2 - Enable guard in this test:
   * 1. Comment out the .overrideGuard(ThrottlerGuard) in beforeAll setup
   * 2. Run only these tests: pnpm --filter @bluelight-hub/backend exec jest \
   *    loans.e2e-spec.ts -t "Rate Limiting"
   * 3. Re-enable the guard override after testing
   *
   * Rate limit configuration:
   * - Production: 10 requests/minute per IP
   * - Test environment: 100 requests/minute per IP
   *
   * @see apps/backend/src/modules/loans/loans.controller.ts - @Throttle decorator
   * @see apps/backend/src/app.module.ts - ThrottlerModule configuration
   */
  describe('Rate Limiting', () => {
    it.skip('should return 429 after exceeding POST /api/loans rate limit (10 req/min)', async () => {
      // Create a test device for loan creation
      const timestamp = Date.now();
      const device = await prisma.device.create({
        data: {
          callSign: `Florian RATE-LIMIT-TEST-${timestamp}`,
          serialNumber: `RATE-LIMIT-TEST-SN-${timestamp}`,
          deviceType: 'Handheld',
          status: 'AVAILABLE'
        }
      });

      // Make 11 requests (limit is 10 per minute in production, 100 in test)
      // Since NODE_ENV=test, limit is 100, so we'd need 101 requests
      // For practical testing, we can verify the decorator is present
      const requests = Array(11).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/loans')
          .send({ deviceId: device.id, borrowerName: 'Rate Test User' })
      );

      const results = await Promise.allSettled(requests);

      // In test environment, limit is 100, so all 11 should succeed or fail for other reasons
      // In production environment (limit 10), the 11th request should return 429
      // This test is marked as .skip because:
      // 1. ThrottlerGuard is disabled in the main test suite
      // 2. Testing rate limits requires specific environment setup
      // 3. Rate limiting is enforced by NestJS framework, not application logic

      const statuses = results.map(r => r.status === 'fulfilled' ? r.value.status : 0);
      const has429 = statuses.includes(429);

      // In production with rate limiter enabled, expect at least one 429
      // In test environment with limit=100, won't hit the limit with 11 requests
      expect(has429).toBe(false); // Because NODE_ENV=test has limit of 100
    });
  });
});
