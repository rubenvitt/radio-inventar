// Set environment variables BEFORE importing AppModule
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-characters-long-for-security';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_APP_URL = 'https://radio-inventar.example.com';

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

describe('Admin Print Template API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let adminSessionCookie: string;

  // Test credentials
  const testAdmin = {
    username: 'printadmin',
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    // Create database pool for cleanup
    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Disable rate limiting in most E2E tests
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

    // Setup session middleware for E2E tests
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

    // Cleanup and create test admin
    await prisma.adminUser.deleteMany({
      where: { username: testAdmin.username },
    });

    const passwordHash = await bcrypt.hash(testAdmin.password, 12);
    await prisma.adminUser.create({
      data: {
        username: testAdmin.username,
        passwordHash,
      },
    });

    // Login as admin and store session cookie
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
      throw new Error('Session cookie not found after login');
    }
    adminSessionCookie = cookie.split(';')[0];
  });

  afterAll(async () => {
    // Cleanup
    await prisma.adminUser.deleteMany({
      where: { username: testAdmin.username },
    });
    await app.close();
    await pool.end();
  });

  describe('GET /api/admin/devices/print-template', () => {
    it('should return PDF with correct content-type (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should return PDF with Content-Disposition header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(
        /attachment; filename="geraete-liste-\d{4}-\d{2}-\d{2}\.pdf"/,
      );
    });

    it('should return valid PDF content (magic bytes)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      const pdfBuffer = Buffer.from(response.body);
      const pdfHeader = pdfBuffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('should return PDF with Content-Length header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(response.headers['content-length']).toBeDefined();
      const contentLength = parseInt(response.headers['content-length'], 10);
      expect(contentLength).toBeGreaterThan(1000); // At least 1KB
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .expect(401);

      expect(response.body.message).toBe('Nicht authentifiziert');
    });

    it('should return 401 with invalid session cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/devices/print-template')
        .set('Cookie', 'radio_inventar_session=invalid-session-id')
        .expect(401);

      expect(response.body.message).toBe('Nicht authentifiziert');
    });
  });

  describe('Rate limiting', () => {
    let appWithRateLimiting: INestApplication;

    beforeAll(async () => {
      // Create a separate app instance with rate limiting enabled
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      appWithRateLimiting = moduleFixture.createNestApplication();
      appWithRateLimiting.setGlobalPrefix('api');
      appWithRateLimiting.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );

      const PgStore = ConnectPgSimple(session);
      const sessionConfig = getSessionConfig();
      appWithRateLimiting.use(
        session({
          ...sessionConfig,
          store: new PgStore({
            pool,
            tableName: 'session',
            pruneSessionInterval: 15 * 60,
          }),
        }),
      );

      await appWithRateLimiting.init();
    });

    afterAll(async () => {
      await appWithRateLimiting.close();
    });

    it('should respect rate limiting (429 after many requests)', async () => {
      // Login to get fresh session
      const loginResponse = await request(appWithRateLimiting.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const cookie = findSessionCookie(cookies);
      if (!cookie) {
        throw new Error('Session cookie not found');
      }
      const rateLimitCookie = cookie.split(';')[0];

      // In test environment, rate limit is 100 requests per minute
      // We'll make enough requests to trigger rate limiting
      const requests: Promise<request.Response>[] = [];

      for (let i = 0; i < 105; i++) {
        requests.push(
          request(appWithRateLimiting.getHttpServer())
            .get('/api/admin/devices/print-template')
            .set('Cookie', rateLimitCookie),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // At least some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000); // Increase timeout for rate limit test
  });
});
