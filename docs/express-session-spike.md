# Express-Session Spike: Session-basierte Admin-Authentifizierung

**Epic 5: Admin-Bereich mit Session-basierter Authentifizierung**
**Datum:** 2025-12-19
**Status:** Spike / Recherche
**Technologie:** NestJS, express-session, PostgreSQL, Prisma

## Übersicht

Diese Dokumentation beschreibt die Integration von express-session in das radio-inventar-Projekt für Session-basierte Authentifizierung im Admin-Bereich. Alle `/api/admin/*` Routen sollen durch einen SessionGuard geschützt werden.

## 1. Express-Session Setup mit NestJS

### 1.1 Installation

Erforderliche Pakete:

```bash
pnpm add express-session connect-pg-simple
pnpm add -D @types/express-session
```

**Abhängigkeiten:**
- `express-session` - Session-Middleware für Express
- `connect-pg-simple` - PostgreSQL Session Store
- `@types/express-session` - TypeScript-Definitionen

### 1.2 TypeScript-Typen erweitern

Erstelle `apps/backend/src/types/express-session.d.ts`:

```typescript
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
  }
}

declare module 'express' {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}
```

Diese Erweiterung ermöglicht typsicheren Zugriff auf Session-Daten.

### 1.3 Integration in NestJS main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import * as session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 3000;
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    // Security: Enable Helmet for security headers
    app.use(helmet());

    // Request body size limits
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // ===== SESSION SETUP =====
    const PgSession = connectPgSimple(session);

    // Session secret aus Environment Variable
    const sessionSecret = configService.get<string>('SESSION_SECRET');
    if (!sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }

    const sessionStore = new PgSession({
      conString: configService.get<string>('DATABASE_URL'),
      tableName: 'session', // Standard-Tabellenname
      createTableIfMissing: true, // Automatische Tabellenerstellung in dev
      ttl: 24 * 60 * 60, // Session Time-to-Live: 24 Stunden
      pruneSessionInterval: 60 * 15, // Cleanup alte Sessions alle 15 Minuten
    });

    app.use(
      session({
        store: sessionStore,
        secret: sessionSecret,
        name: 'ri.sid', // Custom Session-Cookie Name (nicht "connect.sid")
        resave: false, // Nur bei Änderungen speichern
        saveUninitialized: false, // Leere Sessions nicht speichern
        rolling: true, // Session bei jeder Anfrage erneuern
        cookie: {
          secure: isProduction, // HTTPS-only in Production
          httpOnly: true, // Kein JavaScript-Zugriff
          sameSite: 'strict', // CSRF-Schutz
          maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
          path: '/',
        },
      }),
    );

    // CORS configuration
    const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS') ?? '';
    const corsOrigins = allowedOrigins
      ? allowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const finalCorsOrigins = corsOrigins.length > 0
      ? corsOrigins
      : isProduction
        ? []
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

    app.enableCors({
      origin: finalCorsOrigins.length === 0 ? false : finalCorsOrigins,
      credentials: true, // WICHTIG: Erlaubt Session-Cookies
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        disableErrorMessages: isProduction,
      }),
    );

    app.setGlobalPrefix('api');

    // Swagger Setup (disabled in production)
    if (!isProduction) {
      const config = new DocumentBuilder()
        .setTitle('Radio Inventar API')
        .setDescription('API für Funkgeräte-Ausleihe im Katastrophenschutz')
        .setVersion('1.0')
        .addTag('devices', 'Geräteverwaltung')
        .addTag('loans', 'Ausleihverwaltung')
        .addTag('borrowers', 'Ausleiher-Autocomplete')
        .addTag('admin', 'Admin-Bereich (Session-geschützt)')
        .addTag('health', 'Health-Check')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    await app.listen(port);
    app.enableShutdownHooks();
    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    logger.error(`Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

bootstrap().catch((error) => {
  logger.error(`Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
```

**Wichtige Konfigurationsoptionen:**
- `secret`: Wird aus `SESSION_SECRET` Environment Variable geladen
- `resave: false`: Sessions werden nur bei Änderungen gespeichert (reduziert DB-Last)
- `saveUninitialized: false`: Leere Sessions werden nicht gespeichert (GDPR-konform)
- `rolling: true`: Session wird bei jeder Anfrage erneuert (automatisches Session-Renewal)
- `name: 'ri.sid'`: Custom Cookie-Name statt Default `connect.sid` (Security durch Obscurity)

## 2. PostgreSQL Session Store

### 2.1 connect-pg-simple Konfiguration

`connect-pg-simple` ist ein minimalistischer PostgreSQL Session Store für Express. Er nutzt die vorhandene Prisma-Datenbank-Verbindung.

**Vorteile:**
- Nutzt bestehende PostgreSQL-Infrastruktur
- Automatisches Cleanup abgelaufener Sessions
- Performant durch Connection Pooling
- Kompatibel mit Prisma (shared DATABASE_URL)

### 2.2 Session-Tabelle Schema

`connect-pg-simple` erstellt automatisch eine Tabelle mit folgendem Schema (wenn `createTableIfMissing: true`):

```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```

**Schema-Erklärung:**
- `sid` - Session-ID (Primary Key)
- `sess` - Session-Daten als JSON
- `expire` - Ablaufzeitpunkt (für automatisches Cleanup)

**Hinweis:** Diese Tabelle wird **nicht** von Prisma verwaltet, da sie ausschließlich von `connect-pg-simple` genutzt wird. Das ist akzeptabel und gängige Praxis.

### 2.3 Connection Pool Handling

`connect-pg-simple` nutzt die `DATABASE_URL` aus der Environment Variable:

```typescript
const sessionStore = new PgSession({
  conString: configService.get<string>('DATABASE_URL'),
  // ...
});
```

**Best Practices:**
- Die `DATABASE_URL` wird mit Prisma geteilt
- PostgreSQL verwaltet Connection Pooling automatisch
- Standardmäßig nutzt `connect-pg-simple` einen eigenen Pool
- In Production: Nutze externe Connection Pooler wie PgBouncer für bessere Performance

**Alternative mit explizitem Pool:**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: configService.get<string>('DATABASE_URL'),
  max: 10, // Maximale Anzahl an Connections
});

const sessionStore = new PgSession({
  pool,
  tableName: 'session',
});
```

## 3. Security Best Practices

### 3.1 HttpOnly Cookies

```typescript
cookie: {
  httpOnly: true, // Verhindert JavaScript-Zugriff
}
```

**Schutz vor XSS:**
- `document.cookie` liefert Session-Cookie **nicht** zurück
- Cookie kann nur vom Browser an Server gesendet werden
- JavaScript-basierte Session-Hijacking-Angriffe sind unmöglich

### 3.2 Secure Flag (HTTPS)

```typescript
const isProduction = configService.get<string>('NODE_ENV') === 'production';

cookie: {
  secure: isProduction, // In Production: Nur HTTPS
}
```

**Schutz vor Man-in-the-Middle:**
- In Production werden Cookies **nur** über TLS/HTTPS übertragen
- In Development (HTTP) ist `secure: false` für lokale Tests nötig
- Verhindert Network Snooping

### 3.3 SameSite Attribute

```typescript
cookie: {
  sameSite: 'strict', // Stärkster CSRF-Schutz
}
```

**CSRF-Schutz:**
- `strict`: Cookies werden **nur** bei Same-Site Requests gesendet
- `lax`: Cookies bei Navigation von externen Sites (z.B. Links)
- `none`: Cookies bei allen Requests (erfordert `secure: true`)

**Empfehlung für radio-inventar:**
- `sameSite: 'strict'` - Da Admin-Bereich keine Cross-Site Navigationen benötigt

### 3.4 Session Secret aus Environment Variables

**.env.example:**

```env
# Session Secret (mindestens 32 Zeichen, kryptographisch sicher)
SESSION_SECRET=your-secret-key-here-min-32-chars-long
```

**Secret generieren:**

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

**Validation in main.ts:**

```typescript
const sessionSecret = configService.get<string>('SESSION_SECRET');
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

if (sessionSecret.length < 32) {
  logger.warn('SESSION_SECRET should be at least 32 characters long');
}
```

### 3.5 CSRF Protection

Für **State-Changing Requests** (POST/PUT/DELETE) im Admin-Bereich:

**Option 1: SameSite Cookies (bereits aktiviert)**
- `sameSite: 'strict'` bietet starken CSRF-Schutz
- Ausreichend für Single-Page Applications mit Session-Auth

**Option 2: CSRF Token Middleware (zusätzlich)**

```bash
pnpm add csurf
pnpm add -D @types/csurf
```

```typescript
import * as csurf from 'csurf';

// In main.ts nach session setup
app.use(csurf({ cookie: false })); // Nutzt Session statt Cookie
```

**Empfehlung:**
- Für radio-inventar ist `sameSite: 'strict'` ausreichend
- CSRF Tokens nur bei komplexen Cross-Domain Anforderungen nötig

## 4. NestJS Guards

### 4.1 SessionGuard Implementation

**Datei:** `apps/backend/src/common/guards/session.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;

    // Prüfe ob Session existiert und userId gesetzt ist
    if (!session || !session.userId) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Optional: Prüfe isAdmin Flag
    if (!session.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    // Session Renewal: Automatisch durch rolling: true in main.ts
    // request.session.touch(); // Manuelles Renewal (nicht nötig mit rolling)

    return true;
  }
}
```

**Verwendung:**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '@/common/guards/session.guard';

@Controller('admin')
@UseGuards(SessionGuard) // Schützt alle Routen im Controller
export class AdminController {

  @Get('devices')
  async getDevices() {
    // Nur erreichbar mit gültiger Session
    return { message: 'Protected admin route' };
  }
}
```

### 4.2 Dekorator für Session-Daten

**Datei:** `apps/backend/src/common/decorators/session-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const SessionUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      userId: request.session.userId,
      isAdmin: request.session.isAdmin,
    };
  },
);
```

**Verwendung:**

```typescript
@Get('profile')
@UseGuards(SessionGuard)
async getProfile(@SessionUser() user: { userId?: string; isAdmin?: boolean }) {
  return { userId: user.userId, isAdmin: user.isAdmin };
}
```

### 4.3 401 Unauthorized Response

Der `SessionGuard` wirft eine `UnauthorizedException`, die von NestJS automatisch in eine HTTP 401 Response umgewandelt wird:

```json
{
  "statusCode": 401,
  "message": "Session expired or invalid",
  "error": "Unauthorized"
}
```

**Custom Exception Filter (optional):**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class SessionExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(401).json({
      statusCode: 401,
      message: 'Session expired. Please log in again.',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 4.4 Session-Renewal bei Aktivität

**Automatisch durch `rolling: true`:**

```typescript
app.use(
  session({
    // ...
    rolling: true, // Session wird bei JEDER Anfrage erneuert
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 Stunden ab letzter Anfrage
    },
  }),
);
```

**Verhalten:**
- Bei jeder Anfrage wird `maxAge` zurückgesetzt
- Aktive Nutzer werden nicht ausgeloggt
- Inaktive Sessions laufen nach 24h ab

**Manuelle Session-Erneuerung (wenn `rolling: false`):**

```typescript
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.session || !request.session.userId) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Manuelles Renewal
    request.session.touch();

    return true;
  }
}
```

## 5. Beispiel-Code

### 5.1 main.ts Session-Setup (vollständig)

Siehe Abschnitt 1.3 für vollständiges Beispiel.

**Zusammenfassung:**
1. `connect-pg-simple` initialisieren mit `DATABASE_URL`
2. `express-session` Middleware mit Security-Flags
3. CORS mit `credentials: true` für Session-Cookies

### 5.2 auth.controller.ts - Login/Logout

**Datei:** `apps/backend/src/modules/auth/auth.controller.ts`

```typescript
import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from '@/common/guards/session.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ) {
    // Validiere Credentials
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Setze Session-Daten
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    // Session zerstören
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }

      // Cookie löschen
      res.clearCookie('ri.sid');
      return res.json({ message: 'Logout successful' });
    });
  }

  @Get('session')
  @UseGuards(SessionGuard)
  async getSession(@Req() req: Request) {
    return {
      userId: req.session.userId,
      isAdmin: req.session.isAdmin,
    };
  }
}
```

**LoginDto:**

```typescript
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**AuthService (vereinfacht):**

```typescript
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateUser(username: string, password: string) {
    // Nutzer aus DB laden (hypothetisches User Model)
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      return null;
    }

    // Passwort prüfen
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
  }
}
```

### 5.3 session.guard.ts (vollständig)

Siehe Abschnitt 4.1 für vollständiges Beispiel.

**Zusatz: Globaler Guard für /api/admin/\***

```typescript
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { SessionGuard } from './common/guards/session.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
  ],
})
export class AppModule {}
```

**Problem:** Globaler Guard schützt **alle** Routen.

**Lösung:** Route-basierte Guard-Anwendung oder Custom Reflector.

**Custom Reflector für öffentliche Routen:**

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**SessionGuard mit Public-Decorator:**

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Prüfe ob Route als @Public() markiert ist
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Session-Validierung
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;

    if (!session || !session.userId) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    if (!session.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    return true;
  }
}
```

**Verwendung:**

```typescript
@Controller('devices')
export class DevicesController {

  @Get() // Öffentlich
  @Public()
  async findAll() {
    return this.devicesService.findAll();
  }

  @Post() // Geschützt
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }
}
```

## 6. Environment Variables

**.env:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/radio_inventar?schema=public"

# Session
SESSION_SECRET="your-secret-key-here-min-32-chars-long-generated-with-crypto"

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

**.env.example:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/radio_inventar?schema=public"

# Session Secret (mindestens 32 Zeichen, kryptographisch sicher)
# Generieren mit: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=

# Server
PORT=3000
NODE_ENV=development

# CORS (comma-separated)
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

## 7. Testing

### 7.1 Integration Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let sessionCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST) - should login and return session cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password123',
      })
      .expect(200);

    // Session-Cookie extrahieren
    sessionCookie = response.headers['set-cookie'][0];
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('ri.sid');
  });

  it('/admin/devices (GET) - should access protected route with session', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/devices')
      .set('Cookie', sessionCookie)
      .expect(200);
  });

  it('/admin/devices (GET) - should reject without session', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/devices')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 7.2 Manuelle Tests

**Login:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}' \
  -c cookies.txt
```

**Protected Route:**

```bash
curl -X GET http://localhost:3000/api/admin/devices \
  -b cookies.txt
```

**Logout:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## 8. Production Considerations

### 8.1 Session Store Performance

**Problem:** PostgreSQL Session Store kann unter Last langsam werden.

**Lösungen:**
1. **Redis Session Store** (empfohlen für hohe Last):
   ```bash
   pnpm add connect-redis redis
   ```

2. **PgBouncer** für PostgreSQL Connection Pooling

3. **Session Cleanup** regelmäßig ausführen:
   ```sql
   DELETE FROM session WHERE expire < NOW();
   ```

### 8.2 Monitoring

**Session-Tabellen-Größe überwachen:**

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('session')) AS total_size,
  COUNT(*) AS session_count
FROM session;
```

**Abgelaufene Sessions:**

```sql
SELECT COUNT(*) AS expired_sessions
FROM session
WHERE expire < NOW();
```

### 8.3 Backup

Session-Tabelle muss **nicht** im Backup enthalten sein:
- Sessions sind temporär
- Nach Server-Restart müssen Nutzer sich neu einloggen

**.pgdumprc (optional):**

```bash
pg_dump -T session radio_inventar > backup.sql
```

## 9. Alternativen

### 9.1 Redis Session Store

**Vorteile:**
- Sehr performant (In-Memory)
- Automatisches TTL-Handling
- Skalierbar

**Nachteile:**
- Zusätzlicher Service erforderlich
- Komplexere Infrastruktur

**Setup:**

```bash
pnpm add connect-redis redis
```

```typescript
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

const redisClient = createClient({
  url: configService.get<string>('REDIS_URL'),
});

await redisClient.connect();

const sessionStore = new RedisStore({
  client: redisClient,
  prefix: 'ri:sess:',
  ttl: 24 * 60 * 60, // 24 Stunden
});
```

### 9.2 JWT statt Sessions

**Nicht empfohlen für radio-inventar:**
- JWT kann nicht serverseitig invalidiert werden (kein Logout)
- Sessions bieten bessere Kontrolle für Admin-Bereich

## 10. Migration Path für Epic 5

### Phase 1: Setup
1. Pakete installieren (`express-session`, `connect-pg-simple`)
2. TypeScript-Typen erweitern (`express-session.d.ts`)
3. Session-Middleware in `main.ts` integrieren
4. Environment Variables hinzufügen (`SESSION_SECRET`)

### Phase 2: Guards & Auth
1. `SessionGuard` implementieren
2. `auth.controller.ts` erstellen (Login/Logout)
3. `AuthService` mit User-Validierung
4. Optional: `@Public()` Decorator für öffentliche Routen

### Phase 3: Admin Routes
1. Bestehende `/api/admin/*` Routes mit `@UseGuards(SessionGuard)` schützen
2. Frontend Login-Formular implementieren
3. Session-Cookie Handling im Frontend

### Phase 4: Testing & Security
1. Integration Tests schreiben
2. Security Audit (HTTPS, CORS, Cookie-Flags)
3. Session-Cleanup Job einrichten

## 11. Quellen & Referenzen

### Offizielle Dokumentation
- [NestJS Session Documentation](https://docs.nestjs.com/techniques/session)
- [express-session Official Docs](https://expressjs.com/en/resources/middleware/session.html)
- [connect-pg-simple npm Package](https://www.npmjs.com/package/connect-pg-simple)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)

### Tutorials & Best Practices
- [Session Management with Express in NestJS - CodeSignal](https://codesignal.com/learn/courses/securing-and-testing-your-mvc-nestjs-app/lessons/session-management-with-express-in-nestjs)
- [NestJS Session-Based Authentication - Medium](https://medium.com/@musanziwilfried/nestjs-session-based-authentication-65d431870f93)
- [Session-Based Authentication with NestJS - Aurelien Brabant](https://aurelienbrabant.fr/blog/session-based-authentication-with-nestjs)
- [Setting Up Sessions with NestJS, Passport, and Redis - DEV Community](https://dev.to/nestjs/setting-up-sessions-with-nestjs-passport-and-redis-210)
- [nestjs-session Module - GitHub](https://github.com/iamolegga/nestjs-session)

### Security
- [Express Security Best Practices 2025 - Corgea](https://hub.corgea.com/articles/express-security-best-practices-2025)
- [Cookie Security Guide - HttpOnly, Secure, SameSite](https://barrion.io/blog/cookie-security-best-practices)
- [Security Best Practices for Session Management - Medium](https://medium.com/@kasongokakumbiguy/here-are-security-best-practices-for-session-management-nodejs-and-express-3257c2799f46)
- [Poor Express Authentication Patterns - Liran Tal](https://lirantal.com/blog/poor-express-authentication-patterns-nodejs)
- [Cross-Site Request Forgery Prevention - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Prisma & NestJS Integration
- [Prisma with NestJS Guide](https://www.prisma.io/docs/guides/nestjs)
- [Build a REST API with NestJS, Prisma, PostgreSQL](https://www.prisma.io/blog/nestjs-prisma-rest-api-7D056s1BmOL0)
- [Prisma PostgreSQL Pooling with NestJS - Medium](https://medium.com/@elohimcode/architecting-scalability-leveraging-prismas-new-runtime-configuration-with-postgresql-pooling-in-92cb4d4cdf9f)

## 12. Fazit

Express-session mit connect-pg-simple ist eine solide Wahl für die Session-basierte Authentifizierung im radio-inventar Admin-Bereich:

**Vorteile:**
- Bewährte, stabile Technologie
- Nutzt vorhandene PostgreSQL-Datenbank
- Einfache Integration mit NestJS
- Starke Security durch HttpOnly, Secure, SameSite Cookies
- Serverseitige Session-Kontrolle (echtes Logout)

**Nachteile:**
- Zusätzliche DB-Last (minimal bei connect-pg-simple)
- Weniger skalierbar als Redis (für radio-inventar nicht relevant)

**Empfehlung:**
Für Epic 5 ist express-session + connect-pg-simple die richtige Wahl. Bei zukünftigem Wachstum kann auf Redis migriert werden, ohne Code-Änderungen am Guard/Controller.
