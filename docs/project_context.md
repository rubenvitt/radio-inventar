---
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-14'
status: 'complete'
sections_completed: ['technology_stack', 'critical_rules', 'anti_patterns', 'testing', 'git']
---

# Project Context for AI Agents

_Kritische Regeln für radio-inventar. Lies dies VOR jeder Implementierung._

## Technology Stack (Dezember 2025)

| Layer | Package | Version | Hinweis |
|-------|---------|---------|---------|
| Build | vite | ^6.0.0 | Mit @tailwindcss/vite Plugin |
| UI | react | ^19.0.0 | Strict Mode aktiv |
| Router | @tanstack/react-router | ^1.141.0 | File-based Routing |
| Forms | @tanstack/react-form | ^1.27.0 | Mit Zod Adapter |
| Server State | @tanstack/react-query | ^5.90.0 | - |
| Client State | @tanstack/react-store | ^0.8.0 | Nur für Theme |
| Styling | tailwindcss | ^4.0.0 | V4 Syntax! |
| Components | shadcn/ui | latest | Via CLI hinzufügen |
| Validation | zod | ^3.24.0 | - |
| Backend | @nestjs/core | ^11.0.0 | - |
| ORM | prisma | ^7.0.0 | Rust-free Version |
| DB | postgresql | 16 | Via Docker |

## Critical Rules

### Imports & Shared Types

```typescript
// IMMER aus shared package importieren
import { DeviceSchema, type Device } from '@radio-inventar/shared'

// NIEMALS Types lokal duplizieren
// NIEMALS Zod Schemas im Frontend/Backend separat definieren
```

### Zod v3 Syntax

```typescript
// Zod v3 Syntax
import { z } from 'zod'
const schema = z.object({ name: z.string() })
type MyType = z.infer<typeof schema>

// NICHT .parse() direkt verwenden, nutze .safeParse()
```

### TanStack Query Keys

```typescript
// Factory Pattern verwenden
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  detail: (id: string) => [...deviceKeys.all, 'detail', id] as const,
}

// NIEMALS inline Query Keys: useQuery({ queryKey: ['devices'] })
```

### TanStack Router

```typescript
// File-based Routes in src/routes/
// __root.tsx für Root Layout
// _layout.tsx für Nested Layouts (z.B. admin/_layout.tsx)

// KEINE programmatische Route-Definition
```

### NestJS Module Structure

```typescript
// Jedes Feature hat eigenes Modul
// modules/devices/
//   ├── devices.module.ts
//   ├── devices.controller.ts
//   ├── devices.service.ts
//   └── devices.repository.ts  // Prisma-Zugriff NUR hier

// NIEMALS PrismaClient direkt im Controller/Service
```

### Prisma Naming

```prisma
// Model: PascalCase
model Device { ... }

// Fields: camelCase
borrowerName String

// Enum Values: SCREAMING_SNAKE
enum DeviceStatus {
  AVAILABLE
  ON_LOAN
}
```

### API Response Format

```typescript
// Success
{ data: Device[] }
{ data: Device }

// Error
{
  statusCode: 400,
  message: "Validation failed",
  error: "BadRequest",
  errors: [{ field: "name", message: "Required" }]
}

// NIEMALS nackte Arrays oder Objekte zurückgeben
```

### Component Naming

```
components/ui/button.tsx           # shadcn (lowercase)
components/features/DeviceCard.tsx # Custom (PascalCase)
DeviceCard.test.tsx                # Co-located Test

NICHT: components/device-card.tsx  # Kein kebab-case für Custom
NICHT: __tests__/DeviceCard.test.tsx  # Keine separate Test-Ordner
```

### Touch Targets (UX-Requirement)

```typescript
// Minimum 44x44px für alle interaktiven Elemente
<Button className="min-h-11 min-w-11 p-3">

// NIEMALS kleinere Touch Targets im Helfer-Bereich
```

### Dark Mode

```typescript
// Dark Mode ist DEFAULT
// Theme via TanStack Store in stores/theme.ts
// Tailwind dark: Prefix für Light-Mode-Overrides

// NICHT Light Mode als Default
```

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| `any` Type | Explizite Types oder `unknown` |
| Inline Styles | Tailwind Classes |
| console.log | Strukturiertes Logging (Backend) |
| Direkte DB-Zugriffe | Repository Pattern |
| localStorage für Auth | HttpOnly Session Cookie |
| Relative Imports `../../../` | Path Alias `@/` |
| Hardcoded API URLs | Environment Variables |
| Sync Validation | Async safeParse mit Zod |

## Testing Requirements

- **Unit Tests:** Co-located (`.test.tsx` / `.spec.ts`)
- **E2E Tests:** `/e2e/tests/` mit Playwright
- **Backend Tests:** Jest mit `.spec.ts` Suffix
- **Keine Mocks für Prisma** – nutze Test-DB
- **Coverage:** Nicht erzwungen, aber kritische Pfade testen

## Git Conventions

- **Branch:** `feature/story-id-kurze-beschreibung`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`)
- **PRs:** Referenzieren Story-ID
- **Main Branch:** Protected, nur via PR

## File Structure Reference

```
apps/frontend/src/
├── routes/           # TanStack Router (file-based)
├── components/
│   ├── ui/          # shadcn/ui
│   └── features/    # Custom Components
├── api/             # TanStack Query Hooks
├── stores/          # TanStack Store
└── lib/             # Utils, Query Keys

apps/backend/src/
├── modules/         # Feature Modules
├── common/          # Guards, Pipes, Filters
└── config/          # Environment Config

packages/shared/src/
├── schemas/         # Zod Schemas
└── types/           # Inferred Types
```

## Quick Reference

| Task | Command/Pattern |
|------|-----------------|
| Add shadcn component | `npx shadcn@latest add button` |
| Generate Prisma Client | `pnpm --filter backend exec prisma generate` |
| Run migrations | `pnpm --filter backend exec prisma migrate dev` |
| Start dev (all) | `pnpm dev` (from root) |
| Type check | `pnpm tsc --noEmit` |

---

_Zuletzt aktualisiert: 2025-12-14_
