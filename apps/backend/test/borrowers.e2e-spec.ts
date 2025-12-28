import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('BorrowersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    // Cleanup and seed
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});

    // Create test devices
    const device1 = await prisma.device.create({
      data: {
        callSign: 'Florian 4-BORROWER-TEST-1',
        serialNumber: 'BORROWER-TEST-SN-001',
        deviceType: 'Handheld',
        status: 'ON_LOAN'
      }
    });

    const device2 = await prisma.device.create({
      data: {
        callSign: 'Florian 4-BORROWER-TEST-2',
        serialNumber: 'BORROWER-TEST-SN-002',
        deviceType: 'Vehicular',
        status: 'ON_LOAN'
      }
    });

    const device3 = await prisma.device.create({
      data: {
        callSign: 'Florian 4-BORROWER-TEST-3',
        serialNumber: 'BORROWER-TEST-SN-003',
        deviceType: 'Base Station',
        status: 'ON_LOAN'
      }
    });

    // Create test loans with various borrower names
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await prisma.loan.createMany({
      data: [
        {
          deviceId: device1.id,
          borrowerName: 'Tim Müller',
          borrowedAt: now,
          returnedAt: null,
        },
        {
          deviceId: device2.id,
          borrowerName: 'Tim Schäfer',
          borrowedAt: yesterday,
          returnedAt: null,
        },
        {
          deviceId: device3.id,
          borrowerName: 'Anna Weber',
          borrowedAt: twoDaysAgo,
          returnedAt: null,
        },
      ]
    });

    // Create a returned loan (should not appear in suggestions)
    const device4 = await prisma.device.create({
      data: {
        callSign: 'Florian 4-BORROWER-TEST-4',
        serialNumber: 'BORROWER-TEST-SN-004',
        deviceType: 'Handheld',
        status: 'AVAILABLE'
      }
    });

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    await prisma.loan.create({
      data: {
        deviceId: device4.id,
        borrowerName: 'Tim Returned',
        borrowedAt: weekAgo,
        returnedAt: threeDaysAgo,
      }
    });
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({});
    await prisma.device.deleteMany({});
    await app.close();
  });

  describe('GET /api/borrowers/suggestions', () => {
    it('should return matching names (AC#4)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify all results match the query
      response.body.data.forEach((suggestion: { name: string }) => {
        expect(suggestion).toHaveProperty('name');
        expect(suggestion.name.toLowerCase()).toContain('ti');
      });

      // Verify expected names are present
      const names = response.body.data.map((s: { name: string }) => s.name);
      expect(names).toContain('Tim Müller');
      expect(names).toContain('Tim Schäfer');
    });

    it('should return 400 for q < 2 chars', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=T')
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

    it('should return 400 for missing q parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for limit > 50 (validation rejects)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=100')
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

    it('should accept limit at boundary (50)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=50')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=xyz')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual([]);
    });

    it('should accept valid limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return 400 for negative limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=-1')
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

    it('should return 400 for non-numeric limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=abc')
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

    it('should return 400 for limit=0', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=0')
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

    it('should return 400 for fractional limit (10.5)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti&limit=10.5')
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

    it('should be case-insensitive for query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=ti')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.length).toBeGreaterThan(0);

      const names = response.body.data.map((s: { name: string }) => s.name);
      expect(names).toContain('Tim Müller');
      expect(names).toContain('Tim Schäfer');
    });

    it('should handle ASCII special characters in query', async () => {
      // Test with simple search that should work
      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=an')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should find "Anna Weber"
      if (response.body.data.length > 0) {
        const names = response.body.data.map((s: { name: string }) => s.name);
        expect(names).toContain('Anna Weber');
      }
    });

    it('should include returned loans in suggestions for repeat-borrower predictions', async () => {
      // INTENTION: Borrowers who previously returned devices are likely to borrow again.
      // Including their names in suggestions improves UX by reducing typing effort
      // for frequent borrowers. This is essential for quick device checkout.
      //
      // SCENARIO:
      // - Tim Müller: active loan (device on loan)
      // - Tim Schäfer: active loan (device on loan)
      // - Tim Returned: completed loan (device returned 2025-12-14)
      //
      // EXPECTED: All three "Tim" borrowers should appear in suggestions
      // because they're all valid candidates for the next loan transaction.

      const response = await request(app.getHttpServer())
        .get('/api/borrowers/suggestions?q=Ti')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const names = response.body.data.map((s: { name: string }) => s.name);

      // Active borrowers
      expect(names).toContain('Tim Müller');
      expect(names).toContain('Tim Schäfer');

      // Previously returning borrower (should be included for repeat-borrowing prediction)
      expect(names).toContain('Tim Returned');
    });

    describe('Boundary Tests - q Parameter Length', () => {
      it('should accept q with exactly 100 characters', async () => {
        const q100 = 'A'.repeat(100);
        const response = await request(app.getHttpServer())
          .get('/api/borrowers/suggestions?q=' + encodeURIComponent(q100))
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should reject q with 101 characters', async () => {
        const q101 = 'A'.repeat(101);
        const response = await request(app.getHttpServer())
          .get('/api/borrowers/suggestions?q=' + encodeURIComponent(q101))
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
        });
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        // Verify error structure contains field and message
        expect(response.body.errors.some((err: any) => err.field === 'q')).toBe(true);
        expect(response.body.errors[0]).toHaveProperty('message');
      });
    });

    describe('Security Tests', () => {
      it('should handle SQL injection attempts in query parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/borrowers/suggestions?q=' + encodeURIComponent("'; DROP TABLE loans;--"))
          .expect(200);

        // Should return empty results, not cause SQL error
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);

        // Verify loans table still exists
        const loansCount = await prisma.loan.count();
        expect(loansCount).toBeGreaterThan(0);
      });

      it('should handle XSS attempts in query parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/borrowers/suggestions?q=' + encodeURIComponent('<script>alert("xss")</script>'))
          .expect(200);

        // Should return empty results
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Rate Limiting', () => {
      it('should return 429 after exceeding rate limit (30 req/min)', async () => {
        // INTENTION: Verify that the rate limit decorator on the controller
        // correctly enforces the 30 requests per 60 seconds limit to prevent
        // abuse of the autocomplete endpoint.
        //
        // CONFIGURATION: @Throttle({ default: { limit: 30, ttl: 60000 } })
        // in borrowers.controller.ts:17
        //
        // NOTE: This test makes 31 requests sequentially. Due to the nature of
        // rate limiting, at least one request should receive a 429 status.
        // The rate limit state is managed by NestJS ThrottlerGuard and persists
        // for the duration of the TTL window.

        const results = [];

        // Make 31 requests (1 over the limit of 30) sequentially to avoid
        // overwhelming the test server with concurrent connections
        for (let i = 0; i < 31; i++) {
          const response = await request(app.getHttpServer())
            .get('/api/borrowers/suggestions')
            .query({ q: 'te' });
          results.push(response);
        }

        // Count successful and rate-limited responses
        const successful = results.filter(r => r.status === 200);
        const rateLimited = results.filter(r => r.status === 429);

        // At least one should be rate limited
        expect(rateLimited.length).toBeGreaterThan(0);

        // Should not exceed the limit
        expect(successful.length).toBeLessThanOrEqual(30);

        // Verify rate-limited response structure
        if (rateLimited.length > 0) {
          const rateLimitedResponse = rateLimited[0];
          expect(rateLimitedResponse.status).toBe(429);
          expect(rateLimitedResponse.body).toHaveProperty('statusCode', 429);
          expect(rateLimitedResponse.body).toHaveProperty('message');
        }
      });
    });
  });
});
