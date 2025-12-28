# Story 2.2: Geräte-Übersicht mit Live-Status

Status: done

## Story

As a **FüKw-Personal**,
I want **auf einen Blick sehen, welche Geräte verfügbar, ausgeliehen oder defekt sind**,
so that **ich sofort weiß, was ich ausgeben kann**.

## Acceptance Criteria

**Given** ich öffne die App auf der Übersicht-Seite (/)
**When** die Seite geladen ist
**Then:**

1. Sehe ich alle Geräte in einem responsiven Grid
2. Jedes Gerät zeigt: Rufname, Status-Badge (farbcodiert), Ausleiher (falls ausgeliehen), Ausleihe-Zeitpunkt
3. Verfügbare Geräte haben einen grünen Badge
4. Ausgeliehene Geräte haben einen orangenen Badge mit Ausleihername
5. Defekte Geräte haben einen roten Badge
6. Geräte in Wartung haben einen grauen Badge
7. Geräte sind sortiert: verfügbar oben, dann ausgeliehen, dann defekt/wartung
8. Loading-State wird während API-Anfrage angezeigt
9. Error-State wird bei Netzwerkfehler angezeigt

## Tasks / Subtasks

- [x] Task 1: TanStack Query Setup (AC: #8, #9)
  - [x] 1.1 Installiere `@tanstack/react-query` in apps/frontend
  - [x] 1.2 Erstelle `apps/frontend/src/lib/queryClient.ts` mit QueryClient Konfiguration
  - [x] 1.3 Erstelle `apps/frontend/src/lib/queryKeys.ts` mit Query Key Factories
  - [x] 1.4 Wrape App mit `QueryClientProvider` in `main.tsx`
  - [x] 1.5 **VERIFY:** QueryClient ist in DevTools sichtbar (optional @tanstack/react-query-devtools)

- [x] Task 2: API Client & Hooks (AC: #1, #8, #9)
  - [x] 2.1 Erstelle `apps/frontend/src/api/client.ts` mit fetch-basiertem API Client
  - [x] 2.2 Konfiguriere Base URL via `import.meta.env.VITE_API_URL`
  - [x] 2.3 Erstelle `apps/frontend/src/api/devices.ts` mit `useDevices()` Hook
  - [x] 2.4 Erstelle `apps/frontend/src/api/loans.ts` mit `useActiveLoans()` Hook
  - [x] 2.5 Kombiniere Devices + Loans zu `DeviceWithLoanInfo[]` im Hook
  - [x] 2.6 **VERIFY:** `useDevices()` liefert typisierte Device-Daten

- [x] Task 3: Device List Component (AC: #1, #7)
  - [x] 3.1 Erstelle `apps/frontend/src/components/features/DeviceList.tsx`
  - [x] 3.2 Implementiere responsives Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - [x] 3.3 Sortiere Geräte nach Status: AVAILABLE → ON_LOAN → DEFECT → MAINTENANCE
  - [x] 3.4 Nutze existierende `DeviceCard` Komponente für jedes Gerät
  - [x] 3.5 Übergebe korrektes `DeviceWithLoanInfo` Objekt an DeviceCard
  - [x] 3.6 **VERIFY:** Geräte werden sortiert und im Grid angezeigt

- [x] Task 4: Loading & Error States (AC: #8, #9)
  - [x] 4.1 Erstelle `apps/frontend/src/components/features/LoadingState.tsx` mit Spinner/Skeleton
  - [x] 4.2 Erstelle `apps/frontend/src/components/features/ErrorState.tsx` mit Retry-Button
  - [x] 4.3 Integriere States in DeviceList basierend auf Query-Status
  - [x] 4.4 Verwende `isLoading`, `isError`, `refetch` von useQuery
  - [x] 4.5 **VERIFY:** Loading-Spinner erscheint beim Laden, Error zeigt Retry-Button

- [x] Task 5: Route Integration (AC: #1-#9)
  - [x] 5.1 Ersetze Mock-Daten in `apps/frontend/src/routes/index.tsx` mit DeviceList
  - [x] 5.2 Entferne `mockDevices` Array und `console.log`
  - [x] 5.3 Importiere und nutze `useDevices()` Hook
  - [x] 5.4 Passe Layout an: Header + DeviceList + Padding für Navigation
  - [x] 5.5 **VERIFY:** Übersicht zeigt echte Daten vom Backend

- [x] Task 6: Deferred Items aus Story 1.4 (Code Quality)
  - [x] 6.1 Füge `role="status"` zu StatusBadge hinzu für Screen Reader
  - [x] 6.2 Verbessere React.memo equality check in DeviceCard (arePropsEqual function)
  - [x] 6.3 Entferne verbleibende console.log Statements
  - [x] 6.4 **VERIFY:** No console.log in production code, Accessibility improved

- [x] Task 7: Unit Tests (AC: alle)
  - [x] 7.1 Erstelle `apps/frontend/src/api/devices.spec.tsx` für useDevices Hook
  - [x] 7.2 Erstelle `apps/frontend/src/api/loans.spec.tsx` für useActiveLoans Hook
  - [x] 7.3 Erstelle `apps/frontend/src/components/features/DeviceList.spec.tsx`
  - [x] 7.4 Erstelle `apps/frontend/src/components/features/LoadingState.spec.tsx`
  - [x] 7.5 Erstelle `apps/frontend/src/components/features/ErrorState.spec.tsx`
  - [x] 7.6 Test: DeviceList sortiert Geräte korrekt nach Status
  - [x] 7.7 Test: Loading state wird bei pending Query angezeigt
  - [x] 7.8 Test: Error state wird bei failed Query angezeigt
  - [x] 7.9 **VERIFY:** `pnpm test` alle Frontend-Tests grün (37 Tests)

- [x] Task 8: Environment Configuration
  - [x] 8.1 Erstelle/Aktualisiere `apps/frontend/.env.example` mit VITE_API_URL
  - [x] 8.2 Erstelle `apps/frontend/.env.local` mit `VITE_API_URL=http://localhost:3000`
  - [x] 8.3 Dokumentiere Environment Variables in README oder Dev Notes
  - [x] 8.4 **VERIFY:** Frontend verbindet sich mit Backend auf localhost:3000

### Review Follow-ups (AI-Review 2025-12-16)

**🔴 HIGH SEVERITY (muss gefixt werden):**

- [x] [AI-Review][HIGH] AC-2: Ausleihe-Zeitpunkt (borrowedAt) im UI anzeigen [DeviceCard.tsx:39-43]
- [x] [AI-Review][HIGH] Error Message Sanitization - keine rohen Error-Messages anzeigen [ErrorState.tsx:14]
- [x] [AI-Review][HIGH] Partial failure handling für Devices+Loans API Calls [devices.ts:66-69]
- [x] [AI-Review][HIGH] API Response Validation mit Zod Schema [devices.ts:45-46]
- [x] [AI-Review][HIGH] XSS Defense-in-Depth: clientseitige Sanitization [DeviceCard.tsx:38-42]

**🟡 MEDIUM SEVERITY (sollte gefixt werden):**

- [x] [AI-Review][MEDIUM] Performance: useCallback für onSelect Handler [DeviceList.tsx:15]
- [x] [AI-Review][MEDIUM] DeviceWithLoanInfo Interface Duplikat entfernen [DeviceCard.tsx:9-12]
- [x] [AI-Review][MEDIUM] Network Timeout mit AbortController implementieren [client.ts:34-40]
- [x] [AI-Review][MEDIUM] Empty onSelect Handler disablen oder implementieren [DeviceList.tsx:15]
- [x] [AI-Review][MEDIUM] staleTime auf 5 Minuten erhöhen [queryClient.ts:6]
- [x] [AI-Review][MEDIUM] Tests: apiClient mocken statt fetch [devices.spec.tsx:8-10]
- [x] [AI-Review][MEDIUM] Tests: refetch() Funktion testen [devices.spec.tsx]
- [x] [AI-Review][MEDIUM] Tests: Boundary Tests für 0/1/3+ Devices [DeviceList.spec.tsx]

**🟢 LOW SEVERITY (nice to have):**

- [x] [AI-Review][LOW] LoadingState: ARIA role="status" und aria-label hinzufügen [LoadingState.tsx:1-7]
- [x] [AI-Review][LOW] Empty State bei 0 Devices anzeigen [DeviceList.tsx:12-18]
- [x] [AI-Review][LOW] STATUS_PRIORITY Konstante dokumentieren [devices.ts:34-39]
- [x] [AI-Review][LOW] Tests: Fragile String-Matching durch flexible Assertions ersetzen [DeviceCard.spec.tsx:71-75]
- [x] [AI-Review][LOW] Tests: Icon innerHTML Comparison durch semantic Testing ersetzen [StatusBadge.spec.tsx:62-75]
- [x] [AI-Review][LOW] Tests: `as any` Type-Casts durch proper Types ersetzen [diverse Test-Dateien]

### Review Follow-ups (AI-Review #2 2025-12-16)

**🔴 HIGH SEVERITY (gefixt):**

- [x] [AI-Review#2][HIGH] XSS in aria-label - device.callSign nicht sanitized [DeviceCard.tsx:64]
- [x] [AI-Review#2][HIGH] Keine Zod-Validierung in loans.ts [loans.ts:27-28]
- [x] [AI-Review#2][HIGH] loans.spec.tsx mockt global.fetch statt apiClient [loans.spec.tsx:8-9]
- [x] [AI-Review#2][HIGH] getUserFriendlyErrorMessage Test-Coverage erweitert [ErrorState.spec.tsx]

**🟡 MEDIUM SEVERITY (gefixt):**

- [x] [AI-Review#2][MEDIUM] Unvollständige Sanitization (Unicode/RTL) [DeviceCard.tsx:12-19]
- [x] [AI-Review#2][MEDIUM] refetchOnWindowFocus zu aggressiv [queryClient.ts:8]
- [x] [AI-Review#2][MEDIUM] Partial Failure silent (console Statements entfernt) [devices.ts:96-98]
- [x] [AI-Review#2][MEDIUM] arePropsEqual ohne onSelect/className [DeviceCard.tsx:73-84]
- [x] [AI-Review#2][MEDIUM] Console Statements in Produktion [DeviceList.tsx, StatusBadge.tsx, devices.ts]
- [x] [AI-Review#2][MEDIUM] Zod-Validation Tests hinzugefügt [loans.spec.tsx:110-124]
- [x] [AI-Review#2][MEDIUM] sanitizeForDisplay Tests hinzugefügt [DeviceCard.spec.tsx:105-145]
- [x] [AI-Review#2][MEDIUM] onSelect undefined Test hinzugefügt [DeviceCard.spec.tsx:127-132]

## Dev Notes

### Kritische Learnings aus Story 2.1 (UNBEDINGT BEFOLGEN!)

**API Response Format:**
```typescript
// GET /api/devices
{ data: Device[] }

// GET /api/loans/active
{ data: ActiveLoan[] }
```

**Type Imports aus Shared Package:**
```typescript
import {
  DeviceSchema,
  DeviceStatusEnum,
  type Device,
  type DeviceStatus,
} from '@radio-inventar/shared';
```

**Pagination (optional für große Listen):**
```typescript
// Query Parameter: ?take=100&skip=0
// Default: take=100, max=500
```

---

### TanStack Query Setup Pattern

**Query Client (`src/lib/queryClient.ts`):**
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
```

**Query Keys Factory (`src/lib/queryKeys.ts`):**
```typescript
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters?: { status?: string }) => [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
};

export const loanKeys = {
  all: ['loans'] as const,
  active: () => [...loanKeys.all, 'active'] as const,
};
```

**Main.tsx Integration:**
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Wrap RouterProvider with QueryClientProvider
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>
```

---

### API Client Pattern

**Fetch-basierter Client (`src/api/client.ts`):**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

**Devices Hook (`src/api/devices.ts`):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { deviceKeys, loanKeys } from '@/lib/queryKeys';
import { apiClient } from './client';
import type { Device } from '@radio-inventar/shared';

interface ApiResponse<T> {
  data: T;
}

interface ActiveLoan {
  id: string;
  deviceId: string;
  borrowerName: string;
  borrowedAt: string;
  device: {
    id: string;
    callSign: string;
    status: string;
  };
}

export interface DeviceWithLoanInfo extends Device {
  borrowerName?: string;
  borrowedAt?: Date;
}

export function useDevices() {
  const devicesQuery = useQuery({
    queryKey: deviceKeys.list(),
    queryFn: () => apiClient<ApiResponse<Device[]>>('/api/devices'),
    select: (response) => response.data,
  });

  const loansQuery = useQuery({
    queryKey: loanKeys.active(),
    queryFn: () => apiClient<ApiResponse<ActiveLoan[]>>('/api/loans/active'),
    select: (response) => response.data,
  });

  // Kombiniere Devices mit Loan Info
  const devicesWithLoans: DeviceWithLoanInfo[] | undefined = devicesQuery.data?.map(device => {
    const activeLoan = loansQuery.data?.find(loan => loan.deviceId === device.id);
    return {
      ...device,
      borrowerName: activeLoan?.borrowerName,
      borrowedAt: activeLoan ? new Date(activeLoan.borrowedAt) : undefined,
    };
  });

  // Sortiere nach Status
  const sortedDevices = devicesWithLoans?.sort((a, b) => {
    const statusOrder = { AVAILABLE: 0, ON_LOAN: 1, DEFECT: 2, MAINTENANCE: 3 };
    return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
  });

  return {
    data: sortedDevices,
    isLoading: devicesQuery.isLoading || loansQuery.isLoading,
    isError: devicesQuery.isError || loansQuery.isError,
    error: devicesQuery.error || loansQuery.error,
    refetch: () => {
      devicesQuery.refetch();
      loansQuery.refetch();
    },
  };
}
```

---

### Component Patterns

**DeviceList Component:**
```typescript
import { useDevices } from '@/api/devices';
import { DeviceCard } from './DeviceCard';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

export function DeviceList() {
  const { data: devices, isLoading, isError, error, refetch } = useDevices();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {devices?.map(device => (
        <DeviceCard
          key={device.id}
          device={device}
          onSelect={() => {/* Navigation zu Ausleihe */}}
        />
      ))}
    </div>
  );
}
```

**LoadingState Component:**
```typescript
export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

**ErrorState Component:**
```typescript
import { TouchButton } from '@/components/ui/touch-button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-destructive text-center">
        Fehler beim Laden der Geräte
      </p>
      <p className="text-muted-foreground text-sm text-center">
        {error?.message || 'Unbekannter Fehler'}
      </p>
      <TouchButton onClick={onRetry} touchSize="lg">
        <RefreshCw className="h-4 w-4 mr-2" />
        Erneut versuchen
      </TouchButton>
    </div>
  );
}
```

---

### Deferred Items aus Story 1.4

**StatusBadge Accessibility Fix:**
```typescript
// In StatusBadge.tsx - füge role="status" hinzu
<Badge
  variant={variant}
  className={cn(badgeStyles, className)}
  role="status"
  aria-label={`Status: ${statusConfig.label}`}
>
```

**DeviceCard memo optimization:**
```typescript
function arePropsEqual(
  prevProps: DeviceCardProps,
  nextProps: DeviceCardProps
): boolean {
  return (
    prevProps.device.id === nextProps.device.id &&
    prevProps.device.status === nextProps.device.status &&
    prevProps.device.borrowerName === nextProps.device.borrowerName &&
    prevProps.disabled === nextProps.disabled
  );
}

export const DeviceCard = memo(DeviceCardComponent, arePropsEqual);
```

---

### Existierende Komponenten (WIEDERVERWENDEN!)

**DeviceCard** (`src/components/features/DeviceCard.tsx`):
- Bereits implementiert mit `DeviceWithLoanInfo` Interface
- Zeigt Rufname, Status, Ausleiher, Zeitpunkt
- Touch-optimiert (88px Mindesthöhe)
- Memoized für Performance

**StatusBadge** (`src/components/features/StatusBadge.tsx`):
- Farbcodierung bereits implementiert
- Icons für jeden Status
- WCAG AA konform

**TouchButton** (`src/components/ui/touch-button.tsx`):
- Touch-optimierte Button-Variante
- Verschiedene Größen (sm, md, lg, xl)

---

### Datei-Struktur nach Implementation

```
apps/frontend/src/
├── api/
│   ├── client.ts           # NEU: Fetch-basierter API Client
│   ├── devices.ts          # NEU: useDevices Hook
│   ├── devices.spec.ts     # NEU: Hook Tests
│   ├── loans.ts            # NEU: useActiveLoans Hook (optional separat)
│   └── loans.spec.ts       # NEU: Hook Tests
├── lib/
│   ├── queryClient.ts      # NEU: TanStack Query Client
│   ├── queryKeys.ts        # NEU: Query Key Factories
│   ├── utils.ts            # Existiert
│   └── touch-targets.ts    # Existiert
├── components/
│   ├── features/
│   │   ├── DeviceCard.tsx       # Existiert (ggf. memo fix)
│   │   ├── DeviceCard.spec.tsx  # Existiert
│   │   ├── DeviceList.tsx       # NEU
│   │   ├── DeviceList.spec.tsx  # NEU
│   │   ├── StatusBadge.tsx      # Existiert (ggf. role fix)
│   │   ├── LoadingState.tsx     # NEU
│   │   ├── LoadingState.spec.tsx # NEU
│   │   ├── ErrorState.tsx       # NEU
│   │   └── ErrorState.spec.tsx  # NEU
│   └── ui/
│       └── ...                  # Existiert
├── routes/
│   ├── __root.tsx              # Existiert
│   └── index.tsx               # AKTUALISIEREN: Mock → DeviceList
└── main.tsx                    # AKTUALISIEREN: QueryClientProvider
```

---

### Test Patterns

**Hook Test mit MSW (Mock Service Worker):**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDevices } from './devices';

const wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useDevices', () => {
  it('fetches and combines devices with loans', async () => {
    const { result } = renderHook(() => useDevices(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.[0]).toHaveProperty('callSign');
  });
});
```

**Component Test:**
```typescript
import { render, screen } from '@testing-library/react';
import { DeviceList } from './DeviceList';

// Mock useDevices hook
vi.mock('@/api/devices', () => ({
  useDevices: () => ({
    data: mockDevices,
    isLoading: false,
    isError: false,
  }),
}));

describe('DeviceList', () => {
  it('renders devices in correct order', () => {
    render(<DeviceList />);

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(mockDevices.length);
  });
});
```

---

### Environment Setup

**.env.example:**
```env
# API Base URL
VITE_API_URL=http://localhost:3000

# Optional: Enable React Query DevTools
VITE_ENABLE_QUERY_DEVTOOLS=true
```

**.env.local (nicht committen):**
```env
VITE_API_URL=http://localhost:3000
```

**Vite Config (existiert):**
```typescript
// vite.config.ts - KEIN Change nötig
// import.meta.env.VITE_* automatisch verfügbar
```

---

### Known Architecture Abweichungen

**Zod v3 statt v4:**
Das Projekt verwendet Zod v3.24.0. Import bleibt: `import { z } from 'zod';`

**Response Format:**
Backend liefert immer `{ data: ... }` Format. Frontend muss `.data` extrahieren.

---

### References

- [Source: docs/architecture.md#Frontend-State-Management] - TanStack Query Patterns
- [Source: docs/architecture.md#API-Response-Patterns] - Response Format
- [Source: docs/prd.md#FR10-FR13] - Live-Übersicht Requirements
- [Source: docs/epics.md#Story-2.2] - Story Definition
- [Source: docs/sprint-artifacts/2-1-backend-api-geraete-ausleihen.md] - Backend API Details
- [Source: docs/sprint-artifacts/1-4-touch-optimiertes-basis-layout-shadcn-ui-setup.md] - Deferred Items
- [Source: apps/frontend/src/components/features/DeviceCard.tsx] - Existierende Komponente
- [Source: apps/frontend/src/components/features/StatusBadge.tsx] - Existierende Komponente

## Dev Agent Record

### Context Reference

Ultimate Context Engine Analyse mit 4 parallelen Subagents:
- Epic 2 Story 2.2 Analyse (Requirements, ACs, Dependencies)
- Frontend Architecture Analyse (TanStack Query, API Patterns)
- Frontend Codebase Analyse (Existierende Komponenten, Patterns)
- Git History Analyse (Recent Commits, Established Patterns)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

**Story erstellt am 2025-12-16:**
- Ultimate Context Engine mit 4 parallelen Subagents
- TanStack Query Setup Pattern dokumentiert
- API Client Pattern mit fetch dokumentiert
- Existierende Komponenten identifiziert (DeviceCard, StatusBadge)
- Deferred Items aus Story 1.4 integriert
- Test Patterns für Hooks und Components
- Environment Configuration dokumentiert

**Implementation abgeschlossen am 2025-12-16:**
- 8 Tasks mit 36 Subtasks in parallelen Subagents implementiert
- TanStack Query v5.67.2 installiert und konfiguriert
- Fetch-basierter API Client mit TypeScript-Typisierung
- useDevices() und useActiveLoans() Hooks mit kombinierter Datenlogik
- Sortierung nach Status-Priorität (AVAILABLE → ON_LOAN → DEFECT → MAINTENANCE)
- DeviceList mit responsivem Grid (1/2/3 Spalten)
- LoadingState und ErrorState Komponenten
- StatusBadge mit role="status" für Accessibility
- DeviceCard mit arePropsEqual für optimierte React.memo Performance
- 37 Unit Tests (7 Test-Dateien) - alle grün
- TypeScript-Check ohne Fehler

**Review Follow-ups behoben am 2025-12-16:**
- 5 HIGH: borrowedAt UI-Anzeige, Error-Sanitization, Partial Failure, Zod-Validation, XSS-Defense
- 8 MEDIUM: useCallback, Interface-Dedupe, AbortController-Timeout, staleTime 5min, Test-Verbesserungen
- 6 LOW: ARIA-Accessibility, Empty-State, JSDoc, Test-Refactoring
- Zod v3.24.0 für API Response Validation installiert
- 47 Unit Tests (8 Test-Dateien) - alle grün
- Alle `as any` Type-Casts durch proper Typing ersetzt

**Review #2 Follow-ups behoben am 2025-12-16:**
- 4 HIGH: XSS in aria-label, Zod-Validierung loans.ts, loans.spec.tsx Mock, Error-Tests
- 8 MEDIUM: Unicode-Sanitization, refetchOnWindowFocus, arePropsEqual, Console-Statements, Test-Coverage
- Loans API Response Validation mit Zod Schema hinzugefügt
- Console Statements aus Production-Code entfernt
- XSS-Sanitization erweitert (Unicode RTL/Zero-Width Chars)
- 54 Unit Tests (7 Test-Dateien) - alle grün
- TypeScript-Check ohne Fehler

### Change Log

| Datum | Änderung | Agent |
|-------|----------|-------|
| 2025-12-16 | Story erstellt mit Ultimate Context Engine (4 parallele Subagents: Epic, Architecture, Frontend Codebase, Git) | Claude Opus 4.5 (Scrum Master) |
| 2025-12-16 | Implementation mit parallelen Subagents: Tasks 1-4, 6, 8 parallel; Task 5 Route Integration; Task 7 Tests | Claude Opus 4.5 (Developer) |
| 2025-12-16 | ADVERSARIAL Code Review mit 4 parallelen Subagents: 19 Issues gefunden (5 HIGH, 8 MEDIUM, 6 LOW), Action Items erstellt | Claude Opus 4.5 (Code Reviewer) |
| 2025-12-16 | Review Follow-ups implementiert: 19/19 Issues behoben, 47 Tests grün, Story bereit für Review | Claude Opus 4.5 (Developer) |
| 2025-12-16 | ADVERSARIAL Code Review #2 mit 4 parallelen Subagents: 12 Issues gefunden (4 HIGH, 8 MEDIUM), automatisch gefixt | Claude Opus 4.5 (Code Reviewer) |
| 2025-12-16 | Review #2 Follow-ups implementiert: 12/12 Issues behoben, 54 Tests grün, Story done | Claude Opus 4.5 (Developer) |

### File List

**Zu erstellende Dateien:**
- `apps/frontend/src/lib/queryClient.ts`
- `apps/frontend/src/lib/queryKeys.ts`
- `apps/frontend/src/api/client.ts`
- `apps/frontend/src/api/devices.ts`
- `apps/frontend/src/api/devices.spec.ts`
- `apps/frontend/src/api/loans.ts`
- `apps/frontend/src/api/loans.spec.ts`
- `apps/frontend/src/components/features/DeviceList.tsx`
- `apps/frontend/src/components/features/DeviceList.spec.tsx`
- `apps/frontend/src/components/features/LoadingState.tsx`
- `apps/frontend/src/components/features/LoadingState.spec.tsx`
- `apps/frontend/src/components/features/ErrorState.tsx`
- `apps/frontend/src/components/features/ErrorState.spec.tsx`
- `apps/frontend/.env.example`

**Zu aktualisierende Dateien:**
- `apps/frontend/src/main.tsx` (QueryClientProvider)
- `apps/frontend/src/routes/index.tsx` (Mock → DeviceList)
- `apps/frontend/src/components/features/StatusBadge.tsx` (role="status")
- `apps/frontend/src/components/features/DeviceCard.tsx` (arePropsEqual)
- `apps/frontend/package.json` (@tanstack/react-query)
