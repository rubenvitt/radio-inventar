// Set environment variables BEFORE importing AppModule
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-characters-long-for-security';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as session from 'express-session';
import { Pool } from 'pg';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { SetupService } from '@/modules/setup/setup.service';
import { getSessionConfig } from '@/config/session.config';
import { AUTH_CONFIG, SETUP_ERROR_MESSAGES, ADMIN_FIELD_LIMITS } from '@radio-inventar/shared';

const ConnectPgSimple = require('connect-pg-simple');

// Helper to find session cookie by name
const findSessionCookie = (cookies: string[]): string | undefined =>
  cookies.find((c: string) => c.startsWith(`${AUTH_CONFIG.SESSION_COOKIE_NAME}=`));

describe('SetupController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let setupService: SetupService;
  let pool: Pool;

  // Test credentials
  const testAdmin = {
    username: 'setupadmin',
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    // Create database pool for cleanup
    pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
    setupService = app.get<SetupService>(SetupService);
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({});
    await pool.end();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up admin users before each test
    await prisma.adminUser.deleteMany({});
    // Invalidate setup service cache
    setupService.invalidateCache();
  });

  describe('GET /api/setup/status', () => {
    it('should return isSetupComplete: false when no admin exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/setup/status')
        .expect(200);

      expect(response.body).toEqual({
        data: { isSetupComplete: false },
      });
    });

    it('should return isSetupComplete: true when admin exists', async () => {
      // Create an admin first
      await request(app.getHttpServer())
        .post('/api/setup')
        .send(testAdmin)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/setup/status')
        .expect(200);

      expect(response.body).toEqual({
        data: { isSetupComplete: true },
      });
    });
  });

  describe('POST /api/setup', () => {
    it('should create admin and return session data when no admin exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send(testAdmin)
        .expect(201);

      expect(response.body).toEqual({
        data: {
          username: testAdmin.username,
          isValid: true,
        },
      });

      // Verify session cookie is set (auto-login)
      const cookies = response.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toBeDefined();
    });

    it('should return 403 when admin already exists', async () => {
      // Create first admin
      await request(app.getHttpServer())
        .post('/api/setup')
        .send(testAdmin)
        .expect(201);

      // Try to create another admin
      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send({
          username: 'anotherAdmin',
          password: 'AnotherPassword123!',
        })
        .expect(403);

      expect(response.body.message).toBe(SETUP_ERROR_MESSAGES.ALREADY_COMPLETE);
    });

    it('should validate username minimum length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send({
          username: 'ab', // Too short
          password: testAdmin.password,
        })
        .expect(400);

      expect(response.body.message).toContain('username');
    });

    it('should validate password minimum length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send({
          username: testAdmin.username,
          password: 'short', // Too short
        })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should allow username at maximum length', async () => {
      const maxUsername = 'a'.repeat(ADMIN_FIELD_LIMITS.USERNAME_MAX);

      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send({
          username: maxUsername,
          password: testAdmin.password,
        })
        .expect(201);

      expect(response.body.data.username).toBe(maxUsername);
    });

    it('should lowercase username for case-insensitive matching', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/setup')
        .send({
          username: 'UPPERCASE_ADMIN',
          password: testAdmin.password,
        })
        .expect(201);

      // Username should be lowercased
      expect(response.body.data.username).toBe('uppercase_admin');
    });

    it('should create valid session that can be used for protected routes', async () => {
      // Create admin and get session cookie
      const setupResponse = await request(app.getHttpServer())
        .post('/api/setup')
        .send(testAdmin)
        .expect(201);

      const cookies = setupResponse.headers['set-cookie'] as string[];
      const sessionCookie = findSessionCookie(cookies);

      // Use session to access protected route
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie || '')
        .expect(200);

      expect(sessionResponse.body.data).toEqual({
        username: testAdmin.username,
        isValid: true,
      });
    });
  });
});
