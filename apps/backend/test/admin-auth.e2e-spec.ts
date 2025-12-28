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
import { getSessionConfig } from '@/config/session.config';
import { AUTH_CONFIG } from '@radio-inventar/shared';
import * as bcrypt from 'bcrypt';

const ConnectPgSimple = require('connect-pg-simple');

// Helper to find session cookie by name (Review #2: centralized cookie name)
const findSessionCookie = (cookies: string[]): string | undefined =>
  cookies.find((c: string) => c.startsWith(`${AUTH_CONFIG.SESSION_COOKIE_NAME}=`));

describe('AdminAuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pool: Pool;

  // Test credentials
  const testAdmin = {
    username: 'testadmin',
    password: 'TestPassword123!',
  };

  const invalidAdmin = {
    username: 'nonexistent',
    password: 'wrongpassword',
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

    // Cleanup existing admin users
    await prisma.adminUser.deleteMany({});

    // Create test admin user
    const passwordHash = await bcrypt.hash(testAdmin.password, 12);
    await prisma.adminUser.create({
      data: {
        username: testAdmin.username,
        passwordHash,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.adminUser.deleteMany({});
    await pool.end();
    await app.close();
  });

  describe('POST /api/admin/auth/login', () => {
    it('should return 200 and session data with valid credentials (AC#1)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });

      // Verify session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('should set session cookie with HttpOnly flag (AC#2 - Cookie Persistence)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Strict');
    });

    it('should return 401 for wrong password (AC#3 - Invalid Credentials)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');

      // Verify generic error message (no enumeration)
      expect(response.body.message).toBe('Ungültige Zugangsdaten');
    });

    it('should return 401 for non-existent user (AC#3 - Invalid Credentials)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: invalidAdmin.username,
          password: invalidAdmin.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');

      // Verify same error message as wrong password (no enumeration)
      expect(response.body.message).toBe('Ungültige Zugangsdaten');
    });

    it('should return same error message for both wrong password and non-existent user (AC#3)', async () => {
      // Test wrong password
      const wrongPasswordResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: 'wrongpassword',
        })
        .expect(401);

      // Test non-existent user
      const nonExistentResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: 'nonexistent',
          password: 'anypassword',
        })
        .expect(401);

      // Both should have identical error messages (prevent enumeration)
      expect(wrongPasswordResponse.body.message).toBe(nonExistentResponse.body.message);
      expect(wrongPasswordResponse.body.message).toBe('Ungültige Zugangsdaten');
    });

    it('should return 400 for missing username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          password: testAdmin.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for empty credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/admin/auth/session', () => {
    it('should return 401 without login (AC#4 - Unauthenticated Access)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 and session info after login (AC#1)', async () => {
      // First login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toBeDefined();

      // Check session status with cookie
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(sessionResponse.body).toHaveProperty('data');
      expect(sessionResponse.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });
    });

    it('should include session cookie in subsequent requests (AC#2 - Cookie Persistence)', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Use cookie in next request
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(sessionResponse.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });
    });
  });

  describe('POST /api/admin/auth/logout', () => {
    it('should return 200 and clear session (AC#1)', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('data');
      expect(logoutResponse.body.data).toMatchObject({
        message: 'Logout erfolgreich',
      });

      // Verify cookie is cleared
      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();

      const clearedCookie = findSessionCookie(logoutCookies);
      expect(clearedCookie).toBeDefined();
      // Cookie should be expired (Max-Age=0 or similar)
      expect(clearedCookie).toMatch(/Max-Age=0|expires=/i);
    });

    it('should invalidate session after logout (AC#1)', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Logout
      await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .set('Cookie', sessionCookie!)
        .expect(200);

      // Try to access session with old cookie - should fail
      await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(401);
    });
  });

  describe('Full Login Flow (AC#1 - Full Login Flow)', () => {
    it('should complete full login-session-logout flow', async () => {
      // Step 1: Login with valid credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      expect(loginResponse.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toBeDefined();

      // Step 2: Verify session is valid
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(sessionResponse.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });

      // Step 3: Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(logoutResponse.body.data).toMatchObject({
        message: 'Logout erfolgreich',
      });

      // Step 4: Verify session is now invalid
      await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(401);
    });
  });

  describe('Rate Limiting (AC#7)', () => {
    // Note: In test environment, limit is 100 requests. This test validates the
    // rate limiting mechanism works correctly by exceeding the limit.
    it('should return 429 after exceeding rate limit (100 req in test env)', async () => {
      // INTENTION: Verify that the rate limit decorator on the controller
      // correctly enforces the limit to prevent brute-force attacks.
      //
      // CONFIGURATION: @Throttle({ default: { limit: 100 (test) / 5 (prod), ttl: 900000 } })
      // in auth.controller.ts (15 minutes = 900000ms)
      //
      // NOTE: Small delays added between requests to prevent race conditions
      // where requests arrive faster than the rate limiter can process them

      const results = [];

      // Make 102 requests (2 over the limit of 100 for test environment)
      for (let i = 0; i < 102; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/admin/auth/login')
          .send({
            username: 'attempt' + i,
            password: 'testpass123', // Min 8 chars to pass validation
          });
        results.push(response);

        // Add small delay every 10 requests to prevent race conditions
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Count successful (401 unauthorized) and rate-limited (429) responses
      const notRateLimited = results.filter(r => r.status === 401);
      const rateLimited = results.filter(r => r.status === 429);

      // At least one should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);

      // Should not exceed the limit
      expect(notRateLimited.length).toBeLessThanOrEqual(100);

      // Verify rate-limited response structure
      if (rateLimited.length > 0) {
        const rateLimitedResponse = rateLimited[0];
        expect(rateLimitedResponse.status).toBe(429);
        expect(rateLimitedResponse.body).toHaveProperty('statusCode', 429);
        expect(rateLimitedResponse.body).toHaveProperty('message');
      }
    });
  });

  describe('Session Cookie Security (AC#2, AC#5)', () => {
    it('should set HttpOnly flag on session cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('should set SameSite=Strict on session cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toContain('SameSite=Strict');
    });

    it('should set correct maxAge for 24h session timeout (AC#5)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      // Cookie should have Max-Age of exactly 24h (86400 seconds)
      expect(sessionCookie).toContain('Max-Age=86400');
    });

    it('should set Path=/ on session cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);
      expect(sessionCookie).toContain('Path=/');
    });
  });

  describe('Security Tests', () => {
    it('should handle SQL injection attempts in username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: "admin'; DROP TABLE admin_user;--",
          password: 'anypassword',
        })
        .expect(401);

      // Should return 401 (invalid credentials), not SQL error
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toBe('Ungültige Zugangsdaten');

      // Verify table still exists
      const userCount = await prisma.adminUser.count();
      expect(userCount).toBeGreaterThan(0);
    });

    it('should handle XSS attempts in username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: '<script>alert("xss")</script>',
          password: 'anypassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toBe('Ungültige Zugangsdaten');
    });

    it('should reject username exceeding max length', async () => {
      const longUsername = 'a'.repeat(1001); // Exceeds pre-transform limit
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: longUsername,
          password: testAdmin.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject password exceeding max length', async () => {
      const longPassword = 'a'.repeat(1001); // Exceeds pre-transform limit
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: longPassword,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject username below min length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: 'ab', // Min is 3 characters
          password: testAdmin.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject password below min length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: 'abc', // Min is 8 characters
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('AC6: Protected Routes', () => {
    it('should return 401 for /api/admin/auth/session without session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
      // Verify message mentions session (case-insensitive)
      expect(response.body.message.toLowerCase()).toMatch(/session|unauthenticated|unauthorized/);
    });

    it('should return 401 for /api/admin/auth/logout without session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should allow access to /api/admin/auth/session with valid session', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Access protected route with session
      const response = await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(response.body.data).toMatchObject({
        username: testAdmin.username,
        isValid: true,
      });
    });

    it('should allow access to /api/admin/auth/logout with valid session', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Access protected route with session
      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/logout')
        .set('Cookie', sessionCookie!)
        .expect(200);

      expect(response.body.data).toMatchObject({
        message: 'Logout erfolgreich',
      });
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across multiple requests', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = findSessionCookie(cookies);

      // Make multiple session checks (increased to 5 for better validation)
      for (let i = 0; i < 5; i++) {
        const sessionResponse = await request(app.getHttpServer())
          .get('/api/admin/auth/session')
          .set('Cookie', sessionCookie!)
          .expect(200);

        expect(sessionResponse.body.data).toMatchObject({
          username: testAdmin.username,
          isValid: true,
        });
      }
    });

    it('should reject invalid session cookie', async () => {
      const invalidCookie = `${AUTH_CONFIG.SESSION_COOKIE_NAME}=invalid-session-id`;

      await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', invalidCookie)
        .expect(401);
    });

    it('should reject tampered session cookie', async () => {
      // Login to get a real cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      let sessionCookie = findSessionCookie(cookies);

      // Tamper with the cookie value (Review #2: use centralized cookie name)
      const cookieNamePattern = new RegExp(`${AUTH_CONFIG.SESSION_COOKIE_NAME}=([^;]+)`);
      sessionCookie = sessionCookie!.replace(cookieNamePattern, `${AUTH_CONFIG.SESSION_COOKIE_NAME}=tampered-value`);

      // Should reject tampered cookie
      await request(app.getHttpServer())
        .get('/api/admin/auth/session')
        .set('Cookie', sessionCookie)
        .expect(401);
    });
  });
});
