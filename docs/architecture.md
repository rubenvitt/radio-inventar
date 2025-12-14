---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - 'docs/prd.md'
  - 'docs/ux-design-specification.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-14'
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-14'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
28 FRs organisiert in 6 Bereiche:
- Geräteausleihe (5 FRs): Kernflow für Helfer-Selbstbedienung
- Geräterückgabe (4 FRs): Einfache Rückgabe mit optionaler Zustandsnotiz
- Live-Übersicht (4 FRs): Echtzeit-Status aller Geräte
- Geräteverwaltung (6 FRs): Admin-CRUD für Gerätestammdaten
- Historie & Reporting (6 FRs): Ausleihe-Historie und CSV-Export
- Benutzeroberfläche (3 FRs): Dark Mode, Touch, Responsive

**Non-Functional Requirements:**
- Performance: < 3s Load, < 500ms Interaction Feedback, < 30s Ausleihe-UX
- Reliability: Verfügbarkeit während Einsätzen, keine Datenverluste
- Security: Admin-Authentifizierung, Session-Management, keine sensiblen Personendaten
- Usability: Touch-Targets 44x44px, WCAG AA Kontrast, Null-Onboarding

**Scale & Complexity:**
- Primary domain: Full-Stack Web (SPA + REST API)
- Complexity level: Low
- Estimated architectural components: ~15-20 (Frontend) + ~10-15 (Backend)

### Technical Constraints & Dependencies

**Explizite Constraints aus PRD:**
- SPA-Architektur (keine SSR/SSG notwendig, kein SEO)
- Kein Offline-Modus (Internet vorausgesetzt)
- Kein Real-Time (manueller Refresh reicht)
- Moderne Browser only (kein IE/Legacy)
- Tablet-first Design (768px+)

**UX-Vorgaben:**
- Tailwind CSS + shadcn/ui als Design System
- React / Next.js (SPA-Modus) empfohlen
- Performance Budget: < 400KB First Load
- System-Font-Stack (keine externen Fonts)

### Cross-Cutting Concerns Identified

1. **Dual-Auth-Modell**: Helfer-Bereich ohne Auth, Admin-Bereich mit Auth
2. **Theme-System**: Dark Mode (default) + Light Mode durchgängig
3. **Touch-Optimierung**: Konsistente 44-64px Touch-Targets
4. **Optimistic UI**: Sofortiges Feedback, Backend-Sync im Hintergrund
5. **Error-Boundary**: Graceful Degradation bei Netzwerkfehlern
6. **Autocomplete-System**: Name-Suggestions basierend auf Historie

## Starter Template Evaluation

### Technology Stack Decision

**Entscheidung:** Manuelles Setup mit pnpm workspaces

**Begründung:**
- Kein existierender Starter passt exakt zum gewünschten Stack
- Expert-Level erfordert keine Hand-haltende Starter-Struktur
- Low Complexity – kein Nx-Overhead nötig
- Volle Kontrolle über alle Abhängigkeiten und Konfigurationen

### Aktuelle Paketversionen (Dezember 2025)

| Paket | Version | Hinweise |
|-------|---------|----------|
| TanStack Query | v5.90.x | Server-State Management |
| TanStack Store | v0.8.x | Client-State Management |
| Prisma ORM | v7.x | Rust-free, Performance-Verbesserungen |
| Tailwind CSS | v4.x | Via @tailwindcss/vite Plugin |
| shadcn/ui | latest | Vite-Support offiziell |
| NestJS | v11.x | Backend Framework |
| Vite | v6.x | Frontend Build Tool |
| React | v19.x | UI Library |

### Projektstruktur

```
radio-inventar/
├── pnpm-workspace.yaml
├── package.json                 # Root scripts
├── docker-compose.yml           # PostgreSQL + Backend
│
├── packages/
│   └── shared/                  # Shared Types (Device, Loan, etc.)
│       ├── package.json
│       └── src/
│           ├── types/
│           └── index.ts
│
├── apps/
│   ├── frontend/                # Vite + React + TanStack + shadcn/ui
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── stores/
│   │       └── api/
│   │
│   └── backend/                 # NestJS + Prisma + PostgreSQL
│       ├── package.json
│       ├── Dockerfile
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           ├── modules/
│           ├── common/
│           └── main.ts
```

### Architektonische Entscheidungen durch Stack

| Aspekt | Entscheidung |
|--------|--------------|
| Monorepo-Tool | pnpm workspaces |
| Frontend Build | Vite 6.x |
| Frontend Framework | React 19.x |
| Backend Framework | NestJS 11.x |
| ORM | Prisma 7.x |
| Datenbank | PostgreSQL |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Client State | TanStack Store v0.8 |
| Server State | TanStack Query v5.90 |
| Type Sharing | Shared Package für DTOs |

### Deployment-Strategie

| Komponente | Ziel | Methode |
|------------|------|---------|
| Frontend | Cloudflare Pages / Vercel | Static Build Deploy |
| Backend | Self-hosted Server | Docker Compose |
| Datenbank | Self-hosted Server | Docker Compose (PostgreSQL) |

### Initialisierungs-Befehle

```bash
# 1. Monorepo initialisieren
mkdir radio-inventar && cd radio-inventar
pnpm init

# 2. pnpm-workspace.yaml
echo "packages:
  - 'apps/*'
  - 'packages/*'" > pnpm-workspace.yaml

# 3. Frontend
mkdir -p apps/frontend && cd apps/frontend
pnpm create vite@latest . --template react-ts
pnpm add @tanstack/react-query @tanstack/react-store
pnpm add -D tailwindcss @tailwindcss/vite
npx shadcn@latest init

# 4. Backend
cd ../.. && mkdir -p apps/backend && cd apps/backend
npx @nestjs/cli new . --package-manager pnpm --skip-git
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init --datasource-provider postgresql

# 5. Shared Types Package
cd ../.. && mkdir -p packages/shared/src
```

**Hinweis:** Projekt-Initialisierung sollte die erste Implementierungs-Story sein.

## Core Architectural Decisions

### Decision Summary

| Kategorie | Entscheidung | Version | Rationale |
|-----------|--------------|---------|-----------|
| Validierung | Zod | v4.1.x | Shared zwischen Frontend/Backend, Type-Inference |
| Admin-Auth | Session + Cookie | express-session | Einfach, sicher, Self-hosted optimal |
| Auth (Future) | Passkey/WebAuthn | - | Post-MVP für bessere UX |
| API-Docs | Swagger | @nestjs/swagger | Annotationsbasiert, OpenAPI 3.0 |
| Routing | TanStack Router | v1.141.x | Type-safe, passt zu TanStack-Stack |
| Forms | TanStack Form | v1.27.x | Zod-Integration, Signals-basiert |

### Data Architecture

**Validierung: Zod v4**
- Schema-Definitionen im `packages/shared` Package
- Wiederverwendbar in Frontend (Forms) und Backend (DTOs)
- Type-Inference: `z.infer<typeof DeviceSchema>` für TypeScript-Typen
- Performance: 14x schneller als Zod 3, 57% kleineres Bundle

**Prisma + PostgreSQL:**
- Migrations via `prisma migrate dev`
- Type-safe Client generiert aus Schema
- Prisma v7: Rust-free, verbesserte Performance

### Authentication & Security

**Session-basierte Admin-Auth:**
- `express-session` mit `nestjs-session` Wrapper
- HttpOnly Cookie (CSRF-sicher)
- Session-Store: PostgreSQL (via connect-pg-simple) oder Redis
- Session-Timeout nach Inaktivität (NFR9)

**Helfer-Bereich:**
- Kein Auth erforderlich (by design)
- Freitext-Name ohne Validierung gegen User-DB

**Passkey (Post-MVP):**
- WebAuthn API für Passwordless Login
- Verbesserte UX + Security

### API & Communication

**REST API Design:**
- NestJS Controller-Service-Repository Pattern
- Swagger/OpenAPI via `@nestjs/swagger` Decorators
- Standard HTTP Status Codes

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "name", "message": "Required" }]
}
```

**API Endpoints:**

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/api/devices` | Liste aller Geräte | - |
| GET | `/api/devices/:id` | Einzelnes Gerät | - |
| POST | `/api/loans` | Ausleihe erstellen | - |
| DELETE | `/api/loans/:id` | Rückgabe | - |
| GET | `/api/loans/active` | Aktive Ausleihen | - |
| GET | `/api/borrowers/suggestions` | Name-Autocomplete | - |
| POST | `/api/admin/auth/login` | Admin Login | - |
| POST | `/api/admin/auth/logout` | Admin Logout | Admin |
| GET | `/api/admin/devices` | Geräte verwalten | Admin |
| POST | `/api/admin/devices` | Gerät erstellen | Admin |
| PATCH | `/api/admin/devices/:id` | Gerät bearbeiten | Admin |
| DELETE | `/api/admin/devices/:id` | Gerät löschen | Admin |
| GET | `/api/admin/history` | Ausleihe-Historie | Admin |
| GET | `/api/admin/history/export` | CSV-Export | Admin |
| GET | `/api/admin/dashboard` | Dashboard-Stats | Admin |

### Frontend Architecture

**TanStack Router v1:**
- File-based Routing
- Type-safe Route Params
- Loader Pattern für Data Fetching

**TanStack Form v1:**
- Zod-Schema für Validierung
- Signals-basiert (performant)
- Field-Level Validation

**Frontend-Struktur:**
```
apps/frontend/src/
├── routes/
│   ├── __root.tsx           # Layout mit Navigation
│   ├── index.tsx            # Übersicht (Live-Status)
│   ├── loan.tsx             # Ausleihen
│   ├── return.tsx           # Zurückgeben
│   └── admin/
│       ├── _layout.tsx      # Admin Layout (Auth Guard)
│       ├── index.tsx        # Dashboard
│       ├── devices.tsx      # Geräteverwaltung
│       └── history.tsx      # Historie
├── components/
│   ├── ui/                  # shadcn/ui Komponenten
│   └── features/
│       ├── DeviceCard.tsx
│       ├── LoanForm.tsx
│       ├── BorrowerInput.tsx
│       └── ...
├── api/
│   ├── client.ts            # TanStack Query Client
│   ├── devices.ts           # Device API Hooks
│   └── loans.ts             # Loan API Hooks
└── stores/
    └── theme.ts             # Dark/Light Mode
```

### Infrastructure & Deployment

**Docker Compose (Backend + DB):**
```yaml
services:
  backend:
    build: ./apps/backend
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://radio:secret@postgres:5432/radio_inventar
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=radio
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=radio_inventar
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U radio -d radio_inventar"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Environment Variables:**

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://...` |
| `SESSION_SECRET` | Session-Signierung | Random 32+ chars |
| `VITE_API_URL` | Backend URL (Frontend) | `https://api.example.com` |

## Implementation Patterns & Consistency Rules

### Pattern Summary

Diese Patterns stellen sicher, dass alle AI-Agenten konsistenten, kompatiblen Code schreiben.

### Naming Conventions

#### Database (Prisma)

| Element | Convention | Beispiel |
|---------|------------|----------|
| Tabellen | PascalCase | `Device`, `Loan`, `Borrower` |
| Spalten | camelCase | `createdAt`, `borrowerName`, `deviceId` |
| Relationen | camelCase | `device`, `loans` |
| Enums | PascalCase | `DeviceStatus` |
| Enum-Werte | SCREAMING_SNAKE | `AVAILABLE`, `ON_LOAN`, `DEFECT` |

```prisma
model Device {
  id           String       @id @default(cuid())
  callSign     String       @unique  // "Florian 4-23"
  serialNumber String?
  deviceType   String
  status       DeviceStatus @default(AVAILABLE)
  notes        String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  loans        Loan[]
}

enum DeviceStatus {
  AVAILABLE
  ON_LOAN
  DEFECT
  MAINTENANCE
}
```

#### API (JSON)

| Element | Convention | Beispiel |
|---------|------------|----------|
| JSON-Felder | camelCase | `{ "deviceId": "...", "borrowerName": "Tim S." }` |
| Query-Params | camelCase | `?deviceType=handheld&status=available` |
| URL-Pfade | kebab-case | `/api/admin/devices`, `/api/loans/active` |

#### Code (TypeScript)

| Element | Convention | Beispiel |
|---------|------------|----------|
| Komponenten | PascalCase | `DeviceCard.tsx`, `LoanForm.tsx` |
| Hooks | camelCase mit `use` | `useDevices.ts`, `useCreateLoan.ts` |
| Utilities | camelCase | `formatDate.ts`, `cn.ts` |
| Routes | kebab-case | `admin/devices.tsx`, `loan.tsx` |
| Interfaces/Types | PascalCase | `Device`, `CreateLoanDto` |
| Variablen/Funktionen | camelCase | `const deviceList`, `function getDevices()` |

### File Organization

#### Tests

- **Co-located** mit Source-Files
- Unit-Tests: `DeviceCard.test.tsx` neben `DeviceCard.tsx`
- E2E-Tests: `apps/frontend/e2e/`
- Backend-Tests: `apps/backend/src/**/*.spec.ts`

#### Components

```
components/
├── ui/                    # shadcn/ui Basiskomponenten
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
└── features/              # Feature-spezifische Komponenten
    ├── DeviceCard.tsx
    ├── DeviceCard.test.tsx
    ├── LoanForm.tsx
    └── BorrowerInput.tsx
```

#### Backend Modules (NestJS)

```
src/modules/
├── devices/
│   ├── devices.module.ts
│   ├── devices.controller.ts
│   ├── devices.service.ts
│   ├── devices.repository.ts
│   ├── dto/
│   │   ├── create-device.dto.ts
│   │   └── update-device.dto.ts
│   └── devices.controller.spec.ts
├── loans/
└── admin/
```

### API Response Patterns

#### Success Response

```typescript
// Liste
{ data: Device[] }

// Einzelnes Objekt
{ data: Device }

// Pagination (falls benötigt)
{
  data: Device[],
  meta: { total: 42, page: 1, pageSize: 20 }
}
```

#### Error Response

```typescript
{
  statusCode: 400 | 401 | 403 | 404 | 500,
  message: "Human-readable error message",
  error: "BadRequest" | "Unauthorized" | "Forbidden" | "NotFound" | "InternalServerError",
  errors?: [{ field: "name", message: "Required" }]  // Nur bei Validierungsfehlern
}
```

#### HTTP Status Codes

| Code | Verwendung |
|------|------------|
| 200 | Erfolgreiche GET/PATCH-Anfrage |
| 201 | Erfolgreiche POST-Anfrage (Ressource erstellt) |
| 204 | Erfolgreiche DELETE-Anfrage |
| 400 | Validierungsfehler |
| 401 | Nicht authentifiziert (Admin-Bereich) |
| 403 | Nicht autorisiert |
| 404 | Ressource nicht gefunden |
| 409 | Konflikt (z.B. Gerät bereits ausgeliehen) |
| 500 | Server-Fehler |

### State Management Patterns

#### TanStack Query Keys

```typescript
// Konsistente Query Keys
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters: DeviceFilters) => [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
}
```

#### Optimistic Updates

```typescript
// Mutation mit Optimistic Update
useMutation({
  mutationFn: createLoan,
  onMutate: async (newLoan) => {
    await queryClient.cancelQueries({ queryKey: loanKeys.active() })
    const previous = queryClient.getQueryData(loanKeys.active())
    queryClient.setQueryData(loanKeys.active(), (old) => [...old, newLoan])
    return { previous }
  },
  onError: (err, newLoan, context) => {
    queryClient.setQueryData(loanKeys.active(), context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: loanKeys.active() })
  },
})
```

### Error Handling Patterns

#### Frontend

```typescript
// Error Boundary für Routes
<ErrorBoundary fallback={<ErrorPage />}>
  <Outlet />
</ErrorBoundary>

// API-Fehler in Komponenten
const { error } = useDevices()
if (error) return <ErrorMessage error={error} />
```

#### Backend

```typescript
// Global Exception Filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Konsistentes Error-Format
  }
}

// Validation Pipe
app.useGlobalPipes(new ZodValidationPipe())
```

### Enforcement Guidelines

**Alle AI-Agenten MÜSSEN:**

1. Diese Naming Conventions exakt befolgen
2. Co-located Tests schreiben
3. Das definierte API Response Format verwenden
4. Query Keys nach dem dokumentierten Pattern strukturieren
5. Zod-Schemas aus `packages/shared` importieren

**Linting/Formatting:**
- ESLint mit TypeScript-Regeln
- Prettier für konsistente Formatierung
- Biome als Alternative (schneller)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
radio-inventar/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD Pipeline
├── .env.example                      # Environment Template
├── .gitignore
├── docker-compose.yml                # PostgreSQL + Backend
├── docker-compose.dev.yml            # Development Stack
├── package.json                      # Root package (scripts)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
│
├── packages/
│   └── shared/                       # Shared Types & Schemas
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts              # Re-exports
│           ├── schemas/
│           │   ├── device.schema.ts  # Zod: DeviceSchema
│           │   ├── loan.schema.ts    # Zod: LoanSchema, CreateLoanSchema
│           │   └── borrower.schema.ts
│           └── types/
│               ├── device.ts         # z.infer Types
│               ├── loan.ts
│               └── api.ts            # ApiResponse, ApiError
│
├── apps/
│   ├── frontend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── components.json          # shadcn/ui config
│   │   ├── .env.example
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx              # App Entry
│   │       ├── App.tsx               # Router Provider
│   │       ├── globals.css           # Tailwind imports
│   │       │
│   │       ├── routes/               # TanStack Router (File-based)
│   │       │   ├── __root.tsx        # Root Layout + Navigation
│   │       │   ├── index.tsx         # "/" → Übersicht
│   │       │   ├── loan.tsx          # "/loan" → Ausleihen
│   │       │   ├── return.tsx        # "/return" → Zurückgeben
│   │       │   └── admin/
│   │       │       ├── _layout.tsx   # Admin Layout + Auth Guard
│   │       │       ├── index.tsx     # "/admin" → Dashboard
│   │       │       ├── devices.tsx   # "/admin/devices" → CRUD
│   │       │       ├── history.tsx   # "/admin/history" → Historie
│   │       │       └── login.tsx     # "/admin/login"
│   │       │
│   │       ├── components/
│   │       │   ├── ui/               # shadcn/ui (auto-generated)
│   │       │   │   ├── button.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── card.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   ├── toast.tsx
│   │       │   │   └── ...
│   │       │   └── features/
│   │       │       ├── DeviceCard.tsx
│   │       │       ├── DeviceCard.test.tsx
│   │       │       ├── DeviceGrid.tsx
│   │       │       ├── LoanForm.tsx
│   │       │       ├── LoanForm.test.tsx
│   │       │       ├── BorrowerInput.tsx      # Autocomplete
│   │       │       ├── ReturnForm.tsx
│   │       │       ├── StatusBadge.tsx
│   │       │       ├── Navigation.tsx
│   │       │       ├── ThemeToggle.tsx
│   │       │       └── admin/
│   │       │           ├── DeviceTable.tsx
│   │       │           ├── DeviceForm.tsx
│   │       │           ├── HistoryTable.tsx
│   │       │           ├── DashboardStats.tsx
│   │       │           └── ExportButton.tsx
│   │       │
│   │       ├── api/
│   │       │   ├── client.ts         # Axios/Fetch Client + QueryClient
│   │       │   ├── devices.ts        # useDevices, useDevice
│   │       │   ├── loans.ts          # useActiveLoans, useCreateLoan
│   │       │   ├── borrowers.ts      # useBorrowerSuggestions
│   │       │   ├── admin.ts          # useAdminDevices, useHistory
│   │       │   └── auth.ts           # useLogin, useLogout, useSession
│   │       │
│   │       ├── stores/
│   │       │   └── theme.ts          # TanStack Store: Dark/Light
│   │       │
│   │       ├── lib/
│   │       │   ├── utils.ts          # cn(), formatDate()
│   │       │   └── queryKeys.ts      # deviceKeys, loanKeys
│   │       │
│   │       └── types/
│   │           └── router.ts         # Route type declarations
│   │
│   └── backend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── nest-cli.json
│       ├── Dockerfile
│       ├── .env.example
│       │
│       ├── prisma/
│       │   ├── schema.prisma         # DB Models
│       │   ├── migrations/           # Auto-generated
│       │   └── seed.ts               # Initial Data
│       │
│       ├── src/
│       │   ├── main.ts               # Bootstrap, CORS, Session
│       │   ├── app.module.ts         # Root Module
│       │   │
│       │   ├── config/
│       │   │   ├── env.config.ts     # Environment validation
│       │   │   └── session.config.ts # Session setup
│       │   │
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   │   └── public.decorator.ts
│       │   │   ├── filters/
│       │   │   │   └── all-exceptions.filter.ts
│       │   │   ├── guards/
│       │   │   │   └── session-auth.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   └── response.interceptor.ts
│       │   │   └── pipes/
│       │   │       └── zod-validation.pipe.ts
│       │   │
│       │   ├── modules/
│       │   │   ├── prisma/
│       │   │   │   ├── prisma.module.ts
│       │   │   │   └── prisma.service.ts
│       │   │   │
│       │   │   ├── devices/
│       │   │   │   ├── devices.module.ts
│       │   │   │   ├── devices.controller.ts
│       │   │   │   ├── devices.controller.spec.ts
│       │   │   │   ├── devices.service.ts
│       │   │   │   └── devices.repository.ts
│       │   │   │
│       │   │   ├── loans/
│       │   │   │   ├── loans.module.ts
│       │   │   │   ├── loans.controller.ts
│       │   │   │   ├── loans.controller.spec.ts
│       │   │   │   ├── loans.service.ts
│       │   │   │   └── loans.repository.ts
│       │   │   │
│       │   │   ├── borrowers/
│       │   │   │   ├── borrowers.module.ts
│       │   │   │   ├── borrowers.controller.ts
│       │   │   │   └── borrowers.service.ts
│       │   │   │
│       │   │   └── admin/
│       │   │       ├── admin.module.ts
│       │   │       ├── auth/
│       │   │       │   ├── auth.controller.ts
│       │   │       │   ├── auth.service.ts
│       │   │       │   └── auth.controller.spec.ts
│       │   │       ├── devices/
│       │   │       │   ├── admin-devices.controller.ts
│       │   │       │   └── admin-devices.controller.spec.ts
│       │   │       └── history/
│       │   │           ├── history.controller.ts
│       │   │           ├── history.service.ts
│       │   │           └── export.service.ts
│       │   │
│       │   └── dto/
│       │       └── (re-export from @radio-inventar/shared)
│       │
│       └── test/
│           ├── app.e2e-spec.ts
│           └── jest-e2e.json
│
└── e2e/                              # Playwright E2E Tests
    ├── playwright.config.ts
    └── tests/
        ├── loan-flow.spec.ts
        ├── return-flow.spec.ts
        └── admin-flow.spec.ts
```

### Requirements to Structure Mapping

| FR-Bereich | Frontend Location | Backend Location |
|------------|-------------------|------------------|
| **Geräteausleihe (FR1-5)** | `routes/loan.tsx`, `features/LoanForm.tsx`, `features/BorrowerInput.tsx` | `modules/loans/`, `modules/borrowers/` |
| **Geräterückgabe (FR6-9)** | `routes/return.tsx`, `features/ReturnForm.tsx` | `modules/loans/` (DELETE endpoint) |
| **Live-Übersicht (FR10-13)** | `routes/index.tsx`, `features/DeviceGrid.tsx`, `features/StatusBadge.tsx` | `modules/devices/`, `modules/loans/` |
| **Geräteverwaltung (FR14-19)** | `routes/admin/devices.tsx`, `features/admin/DeviceTable.tsx` | `modules/admin/devices/` |
| **Historie (FR20-23)** | `routes/admin/history.tsx`, `features/admin/HistoryTable.tsx` | `modules/admin/history/` |
| **Dashboard (FR24-25)** | `routes/admin/index.tsx`, `features/admin/DashboardStats.tsx` | Aggregated queries in admin module |
| **UI/UX (FR26-28)** | `features/ThemeToggle.tsx`, `stores/theme.ts`, `globals.css` | - |

### Architectural Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (SPA)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │──│ Components  │──│  API Hooks (TanStack)   │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │ HTTP/REST
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (NestJS)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Controllers │──│  Services   │──│     Repositories        │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │ Prisma Client
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │         PostgreSQL          │
                                    └─────────────────────────────┘
```

### Boundary Rules

| Boundary | Rule |
|----------|------|
| Frontend → Backend | Nur über definierte REST-Endpoints (`/api/*`) |
| Backend → DB | Nur über Prisma Repositories (nie direkt im Controller) |
| Shared Types | Import aus `@radio-inventar/shared` Package |
| Admin-Bereich | Session-Auth Guard auf allen `/api/admin/*` Endpoints |
| Public-Bereich | Keine Auth, aber Rate-Limiting empfohlen |

### Data Flow

```
User Action → Component → API Hook → HTTP Request
                                         ↓
                              Controller → Service → Repository → Prisma → DB
                                         ↓
HTTP Response ← API Hook (Cache Update) ← Component (Re-render)
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Alle Technologie-Entscheidungen arbeiten konfliktfrei zusammen:
- Vite + React + TanStack-Stack harmonieren perfekt
- NestJS + Prisma + PostgreSQL ist eine etablierte, getestete Kombination
- Zod v4 integriert sich nahtlos in Frontend (TanStack Form) und Backend (DTOs)

**Pattern Consistency:**
- Naming Conventions folgen etablierten Prisma/TypeScript-Standards
- API Response Format ist konsistent mit NestJS-Konventionen
- Query Key Pattern folgt TanStack Query Best Practices

**Structure Alignment:**
- Monorepo-Struktur unterstützt Shared Types Package sauber
- Feature-basierte Organisation ermöglicht parallele Entwicklung
- Klare Trennung zwischen Public und Admin-Bereichen

### Requirements Coverage Validation ✅

**Functional Requirements (28/28 = 100%):**

| FR-Bereich | Status | Architektonische Unterstützung |
|------------|--------|-------------------------------|
| Geräteausleihe (FR1-5) | ✅ | LoanForm, BorrowerInput, loans module |
| Geräterückgabe (FR6-9) | ✅ | ReturnForm, DELETE endpoint |
| Live-Übersicht (FR10-13) | ✅ | DeviceGrid, StatusBadge, TanStack Query |
| Geräteverwaltung (FR14-19) | ✅ | Admin CRUD, DeviceTable, DeviceForm |
| Historie & Reporting (FR20-23) | ✅ | HistoryTable, ExportService (CSV) |
| Dashboard (FR24-25) | ✅ | DashboardStats, aggregierte Queries |
| Benutzeroberfläche (FR26-28) | ✅ | ThemeToggle, Tailwind, shadcn/ui |

**Non-Functional Requirements (13/13 = 100%):**

| NFR-Bereich | Status | Architektonische Unterstützung |
|-------------|--------|-------------------------------|
| Performance (NFR1-4) | ✅ | Vite (schneller Build), Optimistic UI, < 400KB Budget |
| Reliability (NFR5-7) | ✅ | PostgreSQL persistent, Prisma Transactions |
| Security (NFR8-10) | ✅ | Session-Auth, HttpOnly Cookie, Admin-Guard |
| Usability (NFR11-13) | ✅ | shadcn/ui Touch-Komponenten, Dark Mode default |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- Alle kritischen Entscheidungen mit exakten Versionen dokumentiert
- Technologie-Auswahl begründet und verifiziert
- Deployment-Strategie klar definiert

**Structure Completeness:**
- Vollständiger Verzeichnisbaum mit allen Dateien
- Klare Modul-Grenzen im Backend
- Feature-basierte Komponenten-Organisation im Frontend

**Pattern Completeness:**
- Naming Conventions für DB, API, Code definiert
- Query Key Factory Pattern dokumentiert
- Optimistic Update Pattern mit Beispiel
- Error Handling Patterns für Frontend und Backend

### Gap Analysis Results

**Kritische Lücken:** Keine

**Wichtige Lücken (nicht blockierend):**
- Logging-Strategie nicht explizit definiert → Kann in Setup-Epic adressiert werden
- Monitoring/Observability nicht spezifiziert → Nice-to-have für Production

**Nice-to-Have:**
- CI/CD Pipeline-Details (GitHub Actions Workflow-Inhalt)
- PostgreSQL Backup-Strategie
- Rate-Limiting für Public Endpoints

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low)
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Fokussierter, moderner Tech-Stack (TanStack-Ökosystem)
- Shared Types Package verhindert Frontend/Backend-Drift
- Einfache Deployment-Strategie passend zur Low-Complexity
- Klare Patterns verhindern AI-Agent-Konflikte
- 100% Requirements Coverage

**Areas for Future Enhancement:**
- Logging/Monitoring in separatem Epic
- Passkey-Auth als Post-MVP Feature
- Rate-Limiting für öffentliche Endpoints
- CI/CD Pipeline-Automatisierung

### Implementation Handoff

**AI Agent Guidelines:**
1. Folge allen architektonischen Entscheidungen exakt wie dokumentiert
2. Verwende Implementation Patterns konsistent über alle Komponenten
3. Respektiere Projektstruktur und definierte Boundaries
4. Importiere Schemas/Types aus `@radio-inventar/shared`
5. Nutze dieses Dokument als Referenz für alle Architektur-Fragen

**First Implementation Priority:**
1. Monorepo-Struktur initialisieren (pnpm workspace)
2. Shared Package mit Zod-Schemas erstellen
3. Backend-Grundstruktur mit Prisma Schema
4. Frontend-Grundstruktur mit TanStack Router
5. Docker Compose für lokale Entwicklung

## Architecture Completion Summary

### Workflow Completion

| Metrik | Wert |
|--------|------|
| **Architecture Decision Workflow** | COMPLETED ✅ |
| **Total Steps Completed** | 8 |
| **Date Completed** | 2025-12-14 |
| **Document Location** | `docs/architecture.md` |

### Final Architecture Deliverables

**Complete Architecture Document:**
- 15+ architektonische Entscheidungen mit spezifischen Versionen
- 6 Implementation Pattern-Kategorien definiert
- Vollständige Projektstruktur mit ~50+ Dateien spezifiziert
- 28 FRs + 13 NFRs vollständig abgedeckt

**Technology Stack Summary:**

| Layer | Technologie | Version |
|-------|-------------|---------|
| Frontend Build | Vite | 6.x |
| Frontend Framework | React | 19.x |
| Routing | TanStack Router | 1.141.x |
| Forms | TanStack Form | 1.27.x |
| Server State | TanStack Query | 5.90.x |
| Client State | TanStack Store | 0.8.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | latest |
| Validation | Zod | 4.1.x |
| Backend | NestJS | 11.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | 16 |

### Quality Assurance

**✅ Architecture Coherence**
- Alle Entscheidungen arbeiten konfliktfrei zusammen
- Technologie-Auswahl ist kompatibel
- Patterns unterstützen architektonische Entscheidungen
- Struktur aligned mit allen Choices

**✅ Requirements Coverage**
- 28/28 funktionale Anforderungen unterstützt
- 13/13 nicht-funktionale Anforderungen adressiert
- Cross-Cutting Concerns behandelt
- Integration Points definiert

**✅ Implementation Readiness**
- Entscheidungen sind spezifisch und actionable
- Patterns verhindern Agent-Konflikte
- Struktur ist vollständig und eindeutig
- Beispiele für Klarheit bereitgestellt

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Implementation mit Epics & Stories basierend auf diesem Architektur-Dokument

