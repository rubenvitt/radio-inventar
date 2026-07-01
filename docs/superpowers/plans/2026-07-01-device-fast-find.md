# Geräte-Schnellsuche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Funkgerät über Suche, Status-Filter und Standort-Gruppen deutlich schneller finden als durch Scrollen — in Übersicht, Ausleihen und Rückgabe.

**Architecture:** Reine, testbare Filterlogik (`lib/device-filter.ts`) + Hook (`useDeviceFilter`) treiben eine geteilte, präsentationale Filterleiste, kompakte Zeilen und einklappbare Standort-Gruppen. Filterung läuft vollständig client-seitig über die bereits geladenen Geräte (21 Stück). Einzige Backend-Änderung: das vorhandene `location`-Feld aus radio-admin durch das Device-DTO durchreichen.

**Tech Stack:** React 19, TanStack Router + Query, Tailwind v4, Radix/shadcn-UI, Zod. Backend: NestJS. Tests: Frontend **Vitest** + @testing-library/react, Backend **Jest** + @nestjs/testing.

## Global Constraints

- **Client-seitige Filterung only** — kein neuer Endpoint, kein Server-Filter, kein Debounce.
- **Scope:** nur `callSign`, `status`, `location` (+ `borrowerName` in der Rückgabe). Keine `opta/issi/funktion/hersteller/bedieneinheit`, kein QR-Scan.
- **Sanitisierung:** neue UI-Texte immer über `sanitizeForDisplay` aus `@/lib/sanitize` (kanonische Version, keine Kopie).
- **Reuse:** `StatusBadge` / `getDeviceStatusMeta` (`@/components/features/StatusBadge`), `Input` (`@/components/ui/input`), `TouchButton` (`@/components/ui/touch-button`), `cn` (`@/lib/utils`).
- **Touch-Ziele ≥ 44px**, deutsche UI-Copy.
- **Statuswerte:** `'AVAILABLE' | 'ON_LOAN' | 'DEFECT' | 'MAINTENANCE'` (aus `@radio-inventar/shared`, Typ `DeviceStatus`).
- **Aktuelle `DeviceWithLoanInfo`-Form** (nach Task 2): `{ id, callSign, serialNumber, deviceType, status, location, borrowerName?, borrowedAt? }`. Ältere Test-Mocks mit `notes/createdAt/updatedAt` sind veraltet — für neue Tests **nicht** übernehmen.
- **Branch:** alle Commits auf `feat/device-fast-find`.

---

### Task 1: Backend — `location` durch das Device-DTO durchreichen

**Files:**
- Modify: `apps/backend/src/modules/devices/dto/device-response.dto.ts`
- Modify: `apps/backend/src/modules/devices/devices.service.ts:30-36`
- Test: `apps/backend/src/modules/devices/devices.service.spec.ts`

**Interfaces:**
- Consumes: `RadioAdminLoanDevice.location: string | null` (bereits im radio-admin-Contract vorhanden).
- Produces: `DeviceResponseDto` erhält `location: string | null`; `DevicesService.findAll()` liefert `location` pro Gerät.

- [ ] **Step 1: Failing test — `location` wird durchgereicht**

In `apps/backend/src/modules/devices/devices.service.spec.ts` den ersten Erwartungswert um `location` erweitern und einen expliziten Passthrough-Test ergänzen. Ersetze den Test `'composes devices from radio-admin with AVAILABLE when no active loan'` (Zeilen 54–62) durch:

```typescript
  it('composes devices from radio-admin with AVAILABLE when no active loan', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice()]);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 'id-1', callSign: 'Florian 4-21', serialNumber: 'SN-001', deviceType: 'Handheld', status: 'AVAILABLE', location: null },
    ]);
  });

  it('passes the radio-admin location through to the response', async () => {
    radioAdmin.fetchLoanableDevices.mockResolvedValue([raDevice({ location: 'FüKW' })]);

    const result = await service.findAll();

    expect(result[0].location).toBe('FüKW');
  });
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/backend test src/modules/devices/devices.service.spec.ts`
Expected: FAIL — `location` fehlt im Ergebnis (`toEqual` schlägt fehl / `result[0].location` ist `undefined`).

- [ ] **Step 3: DTO um `location` erweitern**

In `apps/backend/src/modules/devices/dto/device-response.dto.ts` nach dem `deviceType`-Feld einfügen:

```typescript
  @ApiProperty({ description: 'Physical storage location (radio-admin, free text)', example: 'FüKW', nullable: true })
  location!: string | null;
```

- [ ] **Step 4: Service-Mapping um `location` erweitern**

In `apps/backend/src/modules/devices/devices.service.ts` das `.map()` (Zeilen 30–36) so ändern, dass `location` mitgegeben wird:

```typescript
    let result: DeviceResponseDto[] = devices.map((device) => ({
      id: device.id,
      callSign: device.rufname ?? device.issi,
      serialNumber: device.serialNumber,
      deviceType: device.deviceType,
      location: device.location,
      status: mapRadioAdminStatus(device.status, activeDeviceIds.has(device.id)),
    }));
```

- [ ] **Step 5: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/backend test src/modules/devices/devices.service.spec.ts`
Expected: PASS (alle Tests in der Datei grün).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/devices/dto/device-response.dto.ts apps/backend/src/modules/devices/devices.service.ts apps/backend/src/modules/devices/devices.service.spec.ts
git commit -m "feat(devices): pass radio-admin location through the device DTO"
```

---

### Task 2: Frontend-API — `location` in Schema & Typ

**Files:**
- Modify: `apps/frontend/src/api/devices.ts:13-27`
- Test: `apps/frontend/src/api/devices.spec.tsx`

**Interfaces:**
- Consumes: `location: string | null` aus der `GET /api/devices`-Antwort (Task 1).
- Produces: `RemoteDevice` und `DeviceWithLoanInfo` enthalten `location: string | null`. `useDevices()` reicht `location` über `...device` automatisch durch.

- [ ] **Step 1: Failing test — `location` bleibt erhalten**

In `apps/frontend/src/api/devices.spec.tsx` einen Test ergänzen, der prüft, dass ein Gerät mit `location` durch `useDevices` erhalten bleibt. Muster (an bestehende Mock-Struktur der Datei anpassen — die API-Mock liefert `{ data: [...] }`):

```tsx
it('behält location aus der API bei', async () => {
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/devices') {
      return Promise.resolve({
        data: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', status: 'AVAILABLE', location: 'FüKW' }],
      })
    }
    return Promise.resolve({ data: [] }) // /api/loans/active
  })

  const { result } = renderHook(() => useDevices(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.[0].location).toBe('FüKW')
})
```

> Hinweis: Namen von `mockGet`/`wrapper`/Imports an die bestehende `devices.spec.tsx` angleichen. Falls die Datei einen zentralen `mockDevice`-Builder hat, dort `location` ergänzen statt neu aufzusetzen.

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/api/devices.spec.tsx`
Expected: FAIL — Zod-Schema kennt `location` noch nicht bzw. `data[0].location` ist `undefined`.

- [ ] **Step 3: Schema & Typ erweitern**

In `apps/frontend/src/api/devices.ts` das `DeviceApiSchema` (Zeilen 13–19) um `location` ergänzen:

```typescript
const DeviceApiSchema = z.object({
  id: z.string().cuid2(),
  callSign: z.string(),
  serialNumber: z.string().nullable(),
  deviceType: z.string().nullable(),
  location: z.string().nullable(),
  status: DeviceStatusEnum,
});
```

`DeviceWithLoanInfo extends RemoteDevice` erbt `location` automatisch; die Kombinationslogik (`...device`) reicht es ebenfalls automatisch durch — **keine** weitere Änderung nötig.

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/api/devices.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/api/devices.ts apps/frontend/src/api/devices.spec.tsx
git commit -m "feat(devices): surface location in the frontend device schema"
```

---

### Task 3: Reine Filter- & Gruppierungslogik

**Files:**
- Create: `apps/frontend/src/lib/device-filter.ts`
- Test: `apps/frontend/src/lib/device-filter.spec.ts`

**Interfaces:**
- Consumes: `DeviceWithLoanInfo` (`@/api/devices`).
- Produces:
  - `type DeviceStatusFilter = 'ALL' | 'AVAILABLE' | 'ON_LOAN' | 'UNAVAILABLE'`
  - `interface DeviceFilterState { query: string; status: DeviceStatusFilter }`
  - `interface DeviceLocationGroup { key: string; label: string; devices: DeviceWithLoanInfo[] }`
  - `normalizeSearchText(input: string): string`
  - `filterDevices(devices: DeviceWithLoanInfo[], state: DeviceFilterState): DeviceWithLoanInfo[]`
  - `groupDevicesByLocation(devices: DeviceWithLoanInfo[]): DeviceLocationGroup[]`

- [ ] **Step 1: Write the failing tests**

Create `apps/frontend/src/lib/device-filter.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  normalizeSearchText,
  filterDevices,
  groupDevicesByLocation,
} from './device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: Math.random().toString(36).slice(2),
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('normalizeSearchText', () => {
  it('senkt Groß/Klein und entfernt Umlaute', () => {
    expect(normalizeSearchText('FÜKW')).toBe('fukw')
    expect(normalizeSearchText('Fükw')).toBe('fukw')
  })
  it('mappt ß auf ss und trimmt', () => {
    expect(normalizeSearchText('  Straße ')).toBe('strasse')
  })
})

describe('filterDevices', () => {
  it('leere Query gibt alle zurück', () => {
    const list = [dev(), dev()]
    expect(filterDevices(list, { query: '', status: 'ALL' })).toHaveLength(2)
  })
  it('matcht callSign case-insensitiv als Substring', () => {
    const list = [dev({ callSign: 'Florian 4-21' }), dev({ callSign: 'Rotkreuz 1' })]
    const res = filterDevices(list, { query: '4-21', status: 'ALL' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-21')
  })
  it('matcht Standort und Gerätetyp', () => {
    const list = [dev({ callSign: 'A', location: 'Lager 3' }), dev({ callSign: 'B', location: 'FüKW' })]
    expect(filterDevices(list, { query: 'lager', status: 'ALL' })).toHaveLength(1)
  })
  it('verknüpft mehrere Terme mit UND', () => {
    const list = [
      dev({ callSign: 'Florian 4-21', location: 'FüKW' }),
      dev({ callSign: 'Florian 4-22', location: 'Lager' }),
    ]
    const res = filterDevices(list, { query: 'florian lager', status: 'ALL' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-22')
  })
  it('Umlaut-Query trifft Umlaut-Wert unabhängig von Schreibweise', () => {
    const list = [dev({ callSign: 'A', location: 'FüKW' })]
    expect(filterDevices(list, { query: 'fukw', status: 'ALL' })).toHaveLength(1)
  })
  it('ignoriert null-Felder ohne Fehler', () => {
    const list = [dev({ deviceType: null, serialNumber: null, location: null, callSign: 'X' })]
    expect(filterDevices(list, { query: 'x', status: 'ALL' })).toHaveLength(1)
  })
  it('Statusfilter AVAILABLE / ON_LOAN', () => {
    const list = [dev({ status: 'AVAILABLE' }), dev({ status: 'ON_LOAN' })]
    expect(filterDevices(list, { query: '', status: 'AVAILABLE' })).toHaveLength(1)
    expect(filterDevices(list, { query: '', status: 'ON_LOAN' })).toHaveLength(1)
  })
  it('Statusfilter UNAVAILABLE deckt DEFECT und MAINTENANCE ab', () => {
    const list = [dev({ status: 'DEFECT' }), dev({ status: 'MAINTENANCE' }), dev({ status: 'AVAILABLE' })]
    expect(filterDevices(list, { query: '', status: 'UNAVAILABLE' })).toHaveLength(2)
  })
  it('kombiniert Query und Status', () => {
    const list = [
      dev({ callSign: 'Florian 4-21', status: 'AVAILABLE' }),
      dev({ callSign: 'Florian 4-22', status: 'ON_LOAN' }),
    ]
    const res = filterDevices(list, { query: 'florian', status: 'ON_LOAN' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-22')
  })
})

describe('groupDevicesByLocation', () => {
  it('gruppiert nach Standort, alphabetisch', () => {
    const groups = groupDevicesByLocation([
      dev({ location: 'Lager' }),
      dev({ location: 'FüKW' }),
      dev({ location: 'FüKW' }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['FüKW', 'Lager'])
    expect(groups[0].devices).toHaveLength(2)
  })
  it('legt null/leere Standorte in "Ohne Standort" ganz ans Ende', () => {
    const groups = groupDevicesByLocation([
      dev({ location: null }),
      dev({ location: 'FüKW' }),
      dev({ location: '   ' }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['FüKW', 'Ohne Standort'])
    expect(groups[1].key).toBe('__none__')
    expect(groups[1].devices).toHaveLength(2)
  })
  it('trimmt Standort-Werte beim Gruppieren', () => {
    const groups = groupDevicesByLocation([dev({ location: 'FüKW' }), dev({ location: ' FüKW ' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].devices).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @radio-inventar/frontend test:run src/lib/device-filter.spec.ts`
Expected: FAIL — `Cannot find module './device-filter'`.

- [ ] **Step 3: Implement `device-filter.ts`**

Create `apps/frontend/src/lib/device-filter.ts`:

```typescript
import type { DeviceWithLoanInfo } from '@/api/devices'

export type DeviceStatusFilter = 'ALL' | 'AVAILABLE' | 'ON_LOAN' | 'UNAVAILABLE'

export interface DeviceFilterState {
  query: string
  status: DeviceStatusFilter
}

export interface DeviceLocationGroup {
  key: string
  label: string
  devices: DeviceWithLoanInfo[]
}

export const NO_LOCATION_KEY = '__none__'
const NO_LOCATION_LABEL = 'Ohne Standort'

/**
 * Normalises text for accent-insensitive, case-insensitive substring search.
 * Lowercases, strips combining diacritics (ä→a, ö→o, ü→u via NFD) and maps ß→ss
 * (ß is not a combining diacritic, so NFD leaves it untouched).
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks (from NFD)
    .replace(/ß/g, 'ss')
    .trim()
}

function deviceMatchesQuery(device: DeviceWithLoanInfo, terms: string[]): boolean {
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(
    [device.callSign, device.deviceType, device.serialNumber, device.location]
      .filter(Boolean)
      .join(' '),
  )
  return terms.every((term) => haystack.includes(term))
}

function deviceMatchesStatus(device: DeviceWithLoanInfo, status: DeviceStatusFilter): boolean {
  switch (status) {
    case 'ALL':
      return true
    case 'AVAILABLE':
      return device.status === 'AVAILABLE'
    case 'ON_LOAN':
      return device.status === 'ON_LOAN'
    case 'UNAVAILABLE':
      return device.status === 'DEFECT' || device.status === 'MAINTENANCE'
  }
}

export function filterDevices(
  devices: DeviceWithLoanInfo[],
  { query, status }: DeviceFilterState,
): DeviceWithLoanInfo[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  return devices.filter(
    (device) => deviceMatchesStatus(device, status) && deviceMatchesQuery(device, terms),
  )
}

/**
 * Groups devices by trimmed `location`. Named locations come first sorted
 * alphabetically (de collation); devices without a location fall into a single
 * "Ohne Standort" group appended last. Input order is preserved within a group.
 */
export function groupDevicesByLocation(devices: DeviceWithLoanInfo[]): DeviceLocationGroup[] {
  const named = new Map<string, DeviceWithLoanInfo[]>()
  const none: DeviceWithLoanInfo[] = []

  for (const device of devices) {
    const location = device.location?.trim()
    if (location) {
      const bucket = named.get(location)
      if (bucket) bucket.push(device)
      else named.set(location, [device])
    } else {
      none.push(device)
    }
  }

  const groups: DeviceLocationGroup[] = [...named.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([label, groupDevices]) => ({ key: label, label, devices: groupDevices }))

  if (none.length > 0) {
    groups.push({ key: NO_LOCATION_KEY, label: NO_LOCATION_LABEL, devices: none })
  }

  return groups
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @radio-inventar/frontend test:run src/lib/device-filter.spec.ts`
Expected: PASS (alle Fälle grün).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/device-filter.ts apps/frontend/src/lib/device-filter.spec.ts
git commit -m "feat(devices): add pure client-side device filter + location grouping"
```

---

### Task 4: `useDeviceFilter`-Hook

**Files:**
- Create: `apps/frontend/src/hooks/useDeviceFilter.ts`
- Test: `apps/frontend/src/hooks/useDeviceFilter.spec.ts`

**Interfaces:**
- Consumes: `filterDevices`, `groupDevicesByLocation`, `DeviceStatusFilter`, `DeviceLocationGroup` (Task 3); `DeviceWithLoanInfo`.
- Produces: `useDeviceFilter(devices): UseDeviceFilterResult` mit
  `{ query, setQuery, status, setStatus, filtered, groups, total, matchCount, reset }`.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/hooks/useDeviceFilter.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeviceFilter } from './useDeviceFilter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: Math.random().toString(36).slice(2),
    callSign: 'Florian 4-21',
    serialNumber: null,
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('useDeviceFilter', () => {
  it('startet mit ALL und leerer Query, total = matchCount', () => {
    const devices = [dev(), dev({ callSign: 'B' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    expect(result.current.query).toBe('')
    expect(result.current.status).toBe('ALL')
    expect(result.current.total).toBe(2)
    expect(result.current.matchCount).toBe(2)
  })

  it('filtert bei setQuery und aktualisiert matchCount', () => {
    const devices = [dev({ callSign: 'Florian 4-21' }), dev({ callSign: 'Rotkreuz 1' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    act(() => result.current.setQuery('rotkreuz'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.matchCount).toBe(1)
    expect(result.current.total).toBe(2)
  })

  it('gruppiert das gefilterte Ergebnis nach Standort', () => {
    const devices = [dev({ location: 'Lager' }), dev({ location: 'FüKW' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    expect(result.current.groups.map((g) => g.label)).toEqual(['FüKW', 'Lager'])
  })

  it('reset setzt Query und Status zurück', () => {
    const devices = [dev({ status: 'AVAILABLE' }), dev({ status: 'ON_LOAN' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    act(() => {
      result.current.setQuery('x')
      result.current.setStatus('ON_LOAN')
    })
    act(() => result.current.reset())
    expect(result.current.query).toBe('')
    expect(result.current.status).toBe('ALL')
    expect(result.current.matchCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/hooks/useDeviceFilter.spec.ts`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement the hook**

Create `apps/frontend/src/hooks/useDeviceFilter.ts`:

```typescript
import { useMemo, useState } from 'react'
import type { DeviceWithLoanInfo } from '@/api/devices'
import {
  filterDevices,
  groupDevicesByLocation,
  type DeviceStatusFilter,
  type DeviceLocationGroup,
} from '@/lib/device-filter'

export interface UseDeviceFilterResult {
  query: string
  setQuery: (query: string) => void
  status: DeviceStatusFilter
  setStatus: (status: DeviceStatusFilter) => void
  filtered: DeviceWithLoanInfo[]
  groups: DeviceLocationGroup[]
  total: number
  matchCount: number
  reset: () => void
}

export function useDeviceFilter(devices: DeviceWithLoanInfo[]): UseDeviceFilterResult {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<DeviceStatusFilter>('ALL')

  const filtered = useMemo(
    () => filterDevices(devices, { query, status }),
    [devices, query, status],
  )
  const groups = useMemo(() => groupDevicesByLocation(filtered), [filtered])

  return {
    query,
    setQuery,
    status,
    setStatus,
    filtered,
    groups,
    total: devices.length,
    matchCount: filtered.length,
    reset: () => {
      setQuery('')
      setStatus('ALL')
    },
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/hooks/useDeviceFilter.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/hooks/useDeviceFilter.ts apps/frontend/src/hooks/useDeviceFilter.spec.ts
git commit -m "feat(devices): add useDeviceFilter hook"
```

---

### Task 5: `DeviceFilterBar`-Komponente

**Files:**
- Create: `apps/frontend/src/components/features/DeviceFilterBar.tsx`
- Test: `apps/frontend/src/components/features/DeviceFilterBar.spec.tsx`

**Interfaces:**
- Consumes: `DeviceStatusFilter` (Task 3).
- Produces: `DeviceFilterBar` mit Props
  `{ query: string; onQueryChange: (q: string) => void; status: DeviceStatusFilter; onStatusChange: (s: DeviceStatusFilter) => void; matchCount: number; total: number; className?: string }`.
  Export der Chip-Konfig `STATUS_FILTER_OPTIONS` für Wiederverwendung/Tests.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/components/features/DeviceFilterBar.spec.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceFilterBar } from './DeviceFilterBar'

function setup(over: Partial<React.ComponentProps<typeof DeviceFilterBar>> = {}) {
  const props = {
    query: '',
    onQueryChange: vi.fn(),
    status: 'ALL' as const,
    onStatusChange: vi.fn(),
    matchCount: 21,
    total: 21,
    ...over,
  }
  render(<DeviceFilterBar {...props} />)
  return props
}

describe('DeviceFilterBar', () => {
  it('meldet Tippen im Suchfeld', async () => {
    const props = setup()
    await userEvent.type(screen.getByRole('searchbox'), 'a')
    expect(props.onQueryChange).toHaveBeenCalledWith('a')
  })

  it('zeigt Clear-Button nur bei nicht-leerer Query und leert', async () => {
    const props = setup({ query: 'florian' })
    await userEvent.click(screen.getByRole('button', { name: /suche zurücksetzen/i }))
    expect(props.onQueryChange).toHaveBeenCalledWith('')
  })

  it('wechselt Status per Chip', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Frei' }))
    expect(props.onStatusChange).toHaveBeenCalledWith('AVAILABLE')
  })

  it('markiert den aktiven Status-Chip', () => {
    setup({ status: 'AVAILABLE' })
    expect(screen.getByRole('button', { name: 'Frei' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('zeigt den Trefferzähler', () => {
    setup({ matchCount: 5, total: 21 })
    expect(screen.getByText(/5 von 21 Geräten/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceFilterBar.spec.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `DeviceFilterBar.tsx`**

Create `apps/frontend/src/components/features/DeviceFilterBar.tsx`:

```tsx
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { DeviceStatusFilter } from '@/lib/device-filter'

export const STATUS_FILTER_OPTIONS: { value: DeviceStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Alle' },
  { value: 'AVAILABLE', label: 'Frei' },
  { value: 'ON_LOAN', label: 'Vergeben' },
  { value: 'UNAVAILABLE', label: 'Defekt·Wartung' },
]

interface DeviceFilterBarProps {
  query: string
  onQueryChange: (query: string) => void
  status: DeviceStatusFilter
  onStatusChange: (status: DeviceStatusFilter) => void
  matchCount: number
  total: number
  className?: string
}

export function DeviceFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  matchCount,
  total,
  className,
}: DeviceFilterBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur',
        className,
      )}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          inputMode="search"
          role="searchbox"
          aria-label="Geräte suchen"
          placeholder="Rufname oder Standort…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Suche zurücksetzen"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Nach Status filtern" className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isActive = status === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors touch-manipulation',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {matchCount === total ? `${total} Geräte` : `${matchCount} von ${total} Geräten`}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceFilterBar.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/features/DeviceFilterBar.tsx apps/frontend/src/components/features/DeviceFilterBar.spec.tsx
git commit -m "feat(devices): add DeviceFilterBar (search + status chips + count)"
```

---

### Task 6: `DeviceRow`-Komponente (kompakte Zeile, Übersicht + Ausleihen)

**Files:**
- Create: `apps/frontend/src/components/features/DeviceRow.tsx`
- Test: `apps/frontend/src/components/features/DeviceRow.spec.tsx`

**Interfaces:**
- Consumes: `DeviceWithLoanInfo`; `getDeviceStatusMeta` + `StatusBadge` (`@/components/features/StatusBadge`); `sanitizeForDisplay` (`@/lib/sanitize`).
- Produces: `DeviceRow` mit Props
  `{ device: DeviceWithLoanInfo; onSelect: (deviceId: string) => void; selectable: boolean; selected?: boolean; className?: string }`.
  - `selected === undefined` → Übersicht-Modus (`role="button"`, keine Auswahl-Optik).
  - `selected` boolean → Auswahl-Modus (`role="option"`, `aria-selected`, Häkchen + Ring bei `true`).
  - Klick/Enter/Space rufen `onSelect(device.id)` nur wenn `selectable`.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/components/features/DeviceRow.spec.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceRow } from './DeviceRow'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: 'dev-1',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('DeviceRow', () => {
  it('zeigt Rufname und Gerätetyp', () => {
    render(<DeviceRow device={dev()} onSelect={vi.fn()} selectable />)
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
    expect(screen.getByText('Handheld')).toBeInTheDocument()
  })

  it('zeigt Ausleiher statt Gerätetyp, wenn ausgeliehen', () => {
    render(
      <DeviceRow
        device={dev({ status: 'ON_LOAN', borrowerName: 'Meyer', deviceType: 'Handheld' })}
        onSelect={vi.fn()}
        selectable={false}
      />,
    )
    expect(screen.getByText(/Meyer/)).toBeInTheDocument()
  })

  it('ruft onSelect bei Klick, wenn selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev()} onSelect={onSelect} selectable />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('dev-1')
  })

  it('ruft onSelect nicht, wenn nicht selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev({ status: 'ON_LOAN' })} onSelect={onSelect} selectable={false} />)
    await userEvent.click(screen.getByText('Florian 4-21'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('Auswahl-Modus: role=option + aria-selected', () => {
    render(<DeviceRow device={dev()} onSelect={vi.fn()} selectable selected />)
    const row = screen.getByRole('option')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceRow.spec.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `DeviceRow.tsx`**

Create `apps/frontend/src/components/features/DeviceRow.tsx`:

```tsx
import { memo } from 'react'
import { Check } from 'lucide-react'
import { StatusBadge, getDeviceStatusMeta } from './StatusBadge'
import { sanitizeForDisplay } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import type { DeviceWithLoanInfo } from '@/api/devices'

interface DeviceRowProps {
  device: DeviceWithLoanInfo
  onSelect: (deviceId: string) => void
  selectable: boolean
  selected?: boolean
  className?: string
}

function DeviceRowComponent({ device, onSelect, selectable, selected, className }: DeviceRowProps) {
  const isSelectionMode = selected !== undefined
  const statusMeta = getDeviceStatusMeta(device.status)

  const secondary = device.borrowerName
    ? `${sanitizeForDisplay(device.borrowerName)}${
        device.borrowedAt
          ? ` · ${device.borrowedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
          : ''
      }`
    : sanitizeForDisplay(device.deviceType ?? '')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && selectable) {
      e.preventDefault()
      onSelect(device.id)
    }
  }

  return (
    <div
      role={isSelectionMode ? 'option' : 'button'}
      aria-selected={isSelectionMode ? selected : undefined}
      aria-disabled={!selectable}
      aria-label={`${sanitizeForDisplay(device.callSign)}${device.location ? `, ${sanitizeForDisplay(device.location)}` : ''}`}
      tabIndex={selectable ? 0 : -1}
      onClick={selectable ? () => onSelect(device.id) : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex min-h-[56px] items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors',
        selectable &&
          'cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/10 ring-2 ring-primary dark:bg-primary/20',
        !selectable && 'opacity-60',
        className,
      )}
    >
      <span
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full border', statusMeta?.indicatorClassName)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold leading-tight">{sanitizeForDisplay(device.callSign)}</div>
        <div className="truncate text-sm text-muted-foreground">{secondary}</div>
      </div>
      {isSelectionMode && selected ? (
        <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <StatusBadge status={device.status} showLabel />
      )}
    </div>
  )
}

function arePropsEqual(prev: DeviceRowProps, next: DeviceRowProps): boolean {
  return (
    prev.device.id === next.device.id &&
    prev.device.callSign === next.device.callSign &&
    prev.device.deviceType === next.device.deviceType &&
    prev.device.location === next.device.location &&
    prev.device.status === next.device.status &&
    prev.device.borrowerName === next.device.borrowerName &&
    prev.device.borrowedAt?.getTime() === next.device.borrowedAt?.getTime() &&
    prev.selectable === next.selectable &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    prev.className === next.className
  )
}

export const DeviceRow = memo(DeviceRowComponent, arePropsEqual)
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceRow.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/features/DeviceRow.tsx apps/frontend/src/components/features/DeviceRow.spec.tsx
git commit -m "feat(devices): add compact DeviceRow (overview + selection modes)"
```

---

### Task 7: `DeviceGroup`-Komponente (einklappbare Standort-Sektion)

**Files:**
- Create: `apps/frontend/src/components/features/DeviceGroup.tsx`
- Test: `apps/frontend/src/components/features/DeviceGroup.spec.tsx`

**Interfaces:**
- Produces: `DeviceGroup` mit Props
  `{ label: string; count: number; defaultOpen?: boolean; forceOpen?: boolean; children: React.ReactNode }`.
  - Header ist ein `<button>` mit `aria-expanded`; Inhalt wird bei zugeklapptem Zustand ausgeblendet.
  - `forceOpen` (z. B. bei aktiver Suche) übersteuert den lokalen Zustand → Inhalt immer sichtbar, Header-Toggle deaktiviert.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/components/features/DeviceGroup.spec.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceGroup } from './DeviceGroup'

describe('DeviceGroup', () => {
  it('zeigt Label und Anzahl', () => {
    render(<DeviceGroup label="FüKW" count={8}><div>inhalt</div></DeviceGroup>)
    expect(screen.getByRole('button', { name: /FüKW/ })).toHaveTextContent('8')
  })

  it('klappt bei Klick zu und wieder auf', async () => {
    render(<DeviceGroup label="FüKW" count={2}><div>inhalt</div></DeviceGroup>)
    expect(screen.getByText('inhalt')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /FüKW/ }))
    expect(screen.queryByText('inhalt')).not.toBeInTheDocument()
  })

  it('forceOpen zeigt Inhalt immer und deaktiviert das Zuklappen', async () => {
    render(<DeviceGroup label="FüKW" count={2} forceOpen><div>inhalt</div></DeviceGroup>)
    await userEvent.click(screen.getByRole('button', { name: /FüKW/ }))
    expect(screen.getByText('inhalt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /FüKW/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceGroup.spec.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `DeviceGroup.tsx`**

Create `apps/frontend/src/components/features/DeviceGroup.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeviceGroupProps {
  label: string
  count: number
  defaultOpen?: boolean
  forceOpen?: boolean
  children: React.ReactNode
}

export function DeviceGroup({ label, count, defaultOpen = true, forceOpen = false, children }: DeviceGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = forceOpen || open

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        disabled={forceOpen}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center gap-2 rounded-md px-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} aria-hidden="true" />
        <MapPin className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
        <span className="text-muted-foreground/70">({count})</span>
      </button>
      {isOpen && <div className="flex flex-col gap-2">{children}</div>}
    </section>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceGroup.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/features/DeviceGroup.tsx apps/frontend/src/components/features/DeviceGroup.spec.tsx
git commit -m "feat(devices): add collapsible DeviceGroup section"
```

---

### Task 8: Übersicht umbauen (`DeviceList.tsx`)

**Files:**
- Modify: `apps/frontend/src/components/features/DeviceList.tsx`
- Create: `apps/frontend/src/components/features/DeviceGroupedList.tsx` (geteilte Render-Logik für Gruppen/flach + Kein-Treffer)
- Test: `apps/frontend/src/components/features/DeviceGroupedList.spec.tsx`
- Modify: `apps/frontend/src/components/features/DeviceList.spec.tsx`

**Interfaces:**
- Consumes: `useDeviceFilter` (Task 4), `DeviceFilterBar` (Task 5), `DeviceRow` (Task 6), `DeviceGroup` (Task 7).
- Produces: `DeviceGroupedList` mit Props
  `{ groups: DeviceLocationGroup[]; query: string; total: number; matchCount: number; onReset: () => void; renderRow: (device: DeviceWithLoanInfo) => React.ReactNode }`.
  - Rendert bei `groups.length <= 1` flach ohne Header, sonst je Gruppe eine `DeviceGroup`.
  - `forceOpen` der Gruppen = `query.trim().length > 0`.
  - Bei `matchCount === 0` den Kein-Treffer-Zustand mit „Filter zurücksetzen".

Der `DeviceGroupedList` kapselt die gemeinsame Darstellung, damit Task 9 (Ausleihen) sie wiederverwendet. `renderRow` bestimmt Übersicht- vs. Auswahl-Zeile.

- [ ] **Step 1: Write the failing test for `DeviceGroupedList`**

Create `apps/frontend/src/components/features/DeviceGroupedList.spec.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceGroupedList } from './DeviceGroupedList'
import type { DeviceLocationGroup } from '@/lib/device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return { id: 'd1', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE', ...over }
}
const renderRow = (d: DeviceWithLoanInfo) => <div key={d.id}>{d.callSign}</div>

describe('DeviceGroupedList', () => {
  it('rendert flach (ohne Gruppen-Header) bei einer Gruppe', () => {
    const groups: DeviceLocationGroup[] = [{ key: 'FüKW', label: 'FüKW', devices: [dev()] }]
    render(<DeviceGroupedList groups={groups} query="" total={1} matchCount={1} onReset={vi.fn()} renderRow={renderRow} />)
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /FüKW/ })).not.toBeInTheDocument()
  })

  it('rendert Gruppen-Header bei mehreren Gruppen', () => {
    const groups: DeviceLocationGroup[] = [
      { key: 'FüKW', label: 'FüKW', devices: [dev({ id: 'a', callSign: 'A' })] },
      { key: 'Lager', label: 'Lager', devices: [dev({ id: 'b', callSign: 'B' })] },
    ]
    render(<DeviceGroupedList groups={groups} query="" total={2} matchCount={2} onReset={vi.fn()} renderRow={renderRow} />)
    expect(screen.getByRole('button', { name: /FüKW/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lager/ })).toBeInTheDocument()
  })

  it('zeigt Kein-Treffer-Zustand und ruft onReset', async () => {
    const onReset = vi.fn()
    render(<DeviceGroupedList groups={[]} query="xyz" total={5} matchCount={0} onReset={onReset} renderRow={renderRow} />)
    expect(screen.getByText(/Keine Treffer/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /zurücksetzen/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceGroupedList.spec.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `DeviceGroupedList.tsx`**

Create `apps/frontend/src/components/features/DeviceGroupedList.tsx`:

```tsx
import { PackageOpen } from 'lucide-react'
import { DeviceGroup } from './DeviceGroup'
import { TouchButton } from '@/components/ui/touch-button'
import type { DeviceLocationGroup } from '@/lib/device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

interface DeviceGroupedListProps {
  groups: DeviceLocationGroup[]
  query: string
  total: number
  matchCount: number
  onReset: () => void
  renderRow: (device: DeviceWithLoanInfo) => React.ReactNode
}

export function DeviceGroupedList({ groups, query, matchCount, onReset, renderRow }: DeviceGroupedListProps) {
  if (matchCount === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-4 text-center">
        <PackageOpen className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          {query.trim() ? `Keine Treffer für „${query.trim()}"` : 'Keine Geräte für diesen Filter'}
        </p>
        <TouchButton variant="outline" touchSize="lg" onClick={onReset}>
          Filter zurücksetzen
        </TouchButton>
      </div>
    )
  }

  const forceOpen = query.trim().length > 0

  // Nur eine Gruppe → flach ohne Header rendern.
  if (groups.length <= 1) {
    return <div className="flex flex-col gap-2 p-4">{groups[0]?.devices.map(renderRow)}</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map((group) => (
        <DeviceGroup key={group.key} label={group.label} count={group.devices.length} forceOpen={forceOpen}>
          {group.devices.map(renderRow)}
        </DeviceGroup>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceGroupedList.spec.tsx`
Expected: PASS.

- [ ] **Step 5: `DeviceList.tsx` auf Filter + Zeilen umstellen**

In `apps/frontend/src/components/features/DeviceList.tsx`:
- Import ergänzen: `useDeviceFilter` (`@/hooks/useDeviceFilter`), `DeviceFilterBar`, `DeviceGroupedList`, `DeviceRow`.
- Import entfernen: `DeviceCard`.
- Hook einsetzen und den Rückgabe-Block (Zeilen ~99–174, ab `return (`) ersetzen. Header + `refreshError`-Block bleiben unverändert; **nur** die sr-only-Announcement + das `grid`-Div werden ersetzt:

```tsx
export function DeviceList() {
  const navigate = useNavigate();
  const { data: devices, isLoading, isFetching, isError, error, refetch } = useDevices();
  const { query, setQuery, status, setStatus, groups, total, matchCount, reset } = useDeviceFilter(devices ?? []);
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeviceSelect = useCallback((deviceId: string) => {
    navigate({ to: '/loan', search: { deviceIds: [deviceId] } });
  }, [navigate]);

  // ... handleRefresh, handlePrint, cleanup useEffect BLEIBEN unverändert ...

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  if (!devices || devices.length === 0) {
    // ... bestehender Empty-State BLEIBT unverändert ...
  }

  return (
    <>
      <header className="flex justify-between items-center px-4 py-3">
        {/* ... bestehender Header (Titel + Print/Admin/Refresh) BLEIBT unverändert ... */}
      </header>
      {refreshError && (
        {/* ... bestehender refreshError-Block BLEIBT unverändert ... */}
      )}

      <DeviceFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        matchCount={matchCount}
        total={total}
      />

      <DeviceGroupedList
        groups={groups}
        query={query}
        total={total}
        matchCount={matchCount}
        onReset={reset}
        renderRow={(device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onSelect={handleDeviceSelect}
            selectable={device.status === 'AVAILABLE'}
          />
        )}
      />
    </>
  );
}
```

> Wichtig: `data-testid="device-list"` entfällt (kein Grid mehr). `handleRefresh`, `handlePrint`, der Cleanup-`useEffect`, der Empty-State und der Header bleiben **wortgleich** erhalten.

- [ ] **Step 6: `DeviceList.spec.tsx` anpassen**

In `apps/frontend/src/components/features/DeviceList.spec.tsx`:
- Mock-Geräte um `location` ergänzen; veraltete Felder (`notes/createdAt/updatedAt`) aus den Mocks entfernen, falls vorhanden.
- Assertions entfernen, die auf `data-testid="device-list"` oder pro-Karte-Buttons „Ausleihen"/„Vergeben" prüfen.
- Neue Tests ergänzen (mind. diese zwei):

```tsx
it('filtert die Liste per Suche', async () => {
  mockUseDevices.mockReturnValue(createMockReturn({
    data: [
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' },
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', callSign: 'Rotkreuz 1', serialNumber: null, deviceType: 'Handheld', location: 'Lager', status: 'AVAILABLE' },
    ],
    isSuccess: true, isFetched: true,
  }))
  render(<DeviceList />)
  await userEvent.type(screen.getByRole('searchbox'), 'rotkreuz')
  expect(screen.getByText('Rotkreuz 1')).toBeInTheDocument()
  expect(screen.queryByText('Florian 4-21')).not.toBeInTheDocument()
})

it('navigiert beim Klick auf ein verfügbares Gerät zur Ausleihe', async () => {
  mockUseDevices.mockReturnValue(createMockReturn({
    data: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' }],
    isSuccess: true, isFetched: true,
  }))
  render(<DeviceList />)
  await userEvent.click(screen.getByText('Florian 4-21'))
  expect(mockNavigate).toHaveBeenCalledWith({ to: '/loan', search: { deviceIds: ['aaaaaaaaaaaaaaaaaaaaaaaa'] } })
})
```

- [ ] **Step 7: Run tests — verify they pass**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceList.spec.tsx src/components/features/DeviceGroupedList.spec.tsx`
Expected: PASS. Bei rot: veraltete Grid-/Button-Assertions in `DeviceList.spec.tsx` bereinigen.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/components/features/DeviceList.tsx apps/frontend/src/components/features/DeviceGroupedList.tsx apps/frontend/src/components/features/DeviceGroupedList.spec.tsx apps/frontend/src/components/features/DeviceList.spec.tsx
git commit -m "feat(overview): filter bar + compact rows + location groups"
```

---

### Task 9: Ausleihen umbauen (`DeviceSelector.tsx`)

**Files:**
- Modify: `apps/frontend/src/components/features/DeviceSelector.tsx`
- Modify: `apps/frontend/src/components/features/DeviceSelector.spec.tsx`

**Interfaces:**
- Consumes: `useDeviceFilter`, `DeviceFilterBar`, `DeviceGroupedList`, `DeviceRow`.
- Produces: `DeviceSelector` behält seine Props `{ selectedDeviceIds: string[]; onSelect: (deviceId: string) => void }`, rendert jetzt Filterleiste + gruppierte Auswahl-Zeilen.

- [ ] **Step 1: Failing test — Suche + Auswahl im Selector**

In `apps/frontend/src/components/features/DeviceSelector.spec.tsx` (Struktur an bestehende Datei angleichen; `useDevices` wird gemockt) neue Tests ergänzen:

```tsx
it('filtert die auswählbaren Geräte per Suche', async () => {
  mockUseDevices.mockReturnValue(createMockReturn({
    data: [
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' },
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', callSign: 'Rotkreuz 1', serialNumber: null, deviceType: 'Handheld', location: 'Lager', status: 'AVAILABLE' },
    ],
    isSuccess: true,
  }))
  render(<DeviceSelector selectedDeviceIds={[]} onSelect={vi.fn()} />)
  await userEvent.type(screen.getByRole('searchbox'), 'florian')
  expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
  expect(screen.queryByText('Rotkreuz 1')).not.toBeInTheDocument()
})

it('ruft onSelect beim Klick auf ein verfügbares Gerät', async () => {
  const onSelect = vi.fn()
  mockUseDevices.mockReturnValue(createMockReturn({
    data: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' }],
    isSuccess: true,
  }))
  render(<DeviceSelector selectedDeviceIds={[]} onSelect={onSelect} />)
  await userEvent.click(screen.getByRole('option'))
  expect(onSelect).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa')
})
```

> Falls die bestehende Spec `SelectableDeviceCard`-spezifische Marker prüft, diese Assertions entfernen. `createMockReturn`/`mockUseDevices` ggf. analog zu `DeviceList.spec.tsx` anlegen.

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceSelector.spec.tsx`
Expected: FAIL — Suchfeld/Auswahl-Zeilen existieren noch nicht.

- [ ] **Step 3: `DeviceSelector.tsx` umbauen**

Ersetze den Inhalt von `apps/frontend/src/components/features/DeviceSelector.tsx`:

```tsx
import { useDevices } from '@/api/devices'
import { useDeviceFilter } from '@/hooks/useDeviceFilter'
import { LoadingState } from '@/components/features/LoadingState'
import { ErrorState } from '@/components/features/ErrorState'
import { DeviceFilterBar } from './DeviceFilterBar'
import { DeviceGroupedList } from './DeviceGroupedList'
import { DeviceRow } from './DeviceRow'
import { DeviceStatusEnum } from '@radio-inventar/shared'

interface DeviceSelectorProps {
  selectedDeviceIds: string[]
  onSelect: (deviceId: string) => void
}

export function DeviceSelector({ selectedDeviceIds, onSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading, error, refetch } = useDevices()
  const { query, setQuery, status, setStatus, groups, total, matchCount, reset } = useDeviceFilter(devices ?? [])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (!devices || devices.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Keine Geräte vorhanden</p>
  }

  return (
    <div role="listbox" aria-label="Gerät auswählen">
      <DeviceFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        matchCount={matchCount}
        total={total}
      />
      <DeviceGroupedList
        groups={groups}
        query={query}
        total={total}
        matchCount={matchCount}
        onReset={reset}
        renderRow={(device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onSelect={onSelect}
            selectable={device.status === DeviceStatusEnum.enum.AVAILABLE}
            selected={selectedDeviceIds.includes(device.id)}
          />
        )}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/components/features/DeviceSelector.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/features/DeviceSelector.tsx apps/frontend/src/components/features/DeviceSelector.spec.tsx
git commit -m "feat(loan): filter bar + selectable rows + location groups"
```

---

### Task 10: Rückgabe — schlanke Suche (Rufname + Ausleiher-Name)

**Files:**
- Create: `apps/frontend/src/lib/loan-filter.ts`
- Test: `apps/frontend/src/lib/loan-filter.spec.ts`
- Modify: `apps/frontend/src/routes/return.tsx`
- Modify: `apps/frontend/src/components/features/LoanedDeviceList.spec.tsx` (nur falls Leerzustands-Text sich nicht ändert — sonst neuer Test in `return`)

**Interfaces:**
- Consumes: `ActiveLoan` (`@/api/loans`), `normalizeSearchText` (Task 3).
- Produces: `filterLoans(loans: ActiveLoan[], query: string): ActiveLoan[]` — matcht `device.callSign` **und** `borrowerName` (UND-verknüpfte Terme, normalisiert).

- [ ] **Step 1: Failing test für `filterLoans`**

Create `apps/frontend/src/lib/loan-filter.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { filterLoans } from './loan-filter'
import type { ActiveLoan } from '@/api/loans'

function loan(over: Partial<ActiveLoan> = {}): ActiveLoan {
  return {
    id: Math.random().toString(36).slice(2),
    deviceId: 'd1',
    borrowerName: 'Meyer',
    borrowedAt: '2026-07-01T10:00:00Z',
    device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' },
    ...over,
  }
}

describe('filterLoans', () => {
  it('leere Query gibt alle zurück', () => {
    expect(filterLoans([loan(), loan()], '')).toHaveLength(2)
  })
  it('matcht Rufname', () => {
    const list = [loan({ device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' } }), loan({ device: { id: 'd2', callSign: 'Rotkreuz 1', status: 'ON_LOAN' } })]
    expect(filterLoans(list, '4-21')).toHaveLength(1)
  })
  it('matcht Ausleiher-Name case-insensitiv', () => {
    const list = [loan({ borrowerName: 'Meyer' }), loan({ borrowerName: 'Schulze' })]
    const res = filterLoans(list, 'meyer')
    expect(res).toHaveLength(1)
    expect(res[0].borrowerName).toBe('Meyer')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @radio-inventar/frontend test:run src/lib/loan-filter.spec.ts`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `loan-filter.ts`**

Create `apps/frontend/src/lib/loan-filter.ts`:

```typescript
import type { ActiveLoan } from '@/api/loans'
import { normalizeSearchText } from './device-filter'

export function filterLoans(loans: ActiveLoan[], query: string): ActiveLoan[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return loans
  return loans.filter((loan) => {
    const haystack = normalizeSearchText(`${loan.device.callSign} ${loan.borrowerName}`)
    return terms.every((term) => haystack.includes(term))
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @radio-inventar/frontend test:run src/lib/loan-filter.spec.ts`
Expected: PASS.

- [ ] **Step 5: Suchfeld in `return.tsx` einbauen**

In `apps/frontend/src/routes/return.tsx`:
- Imports ergänzen: `useMemo, useState` (React), `Search, X` (lucide), `Input` (`@/components/ui/input`), `filterLoans` (`@/lib/loan-filter`).
- Vor dem `LoanedDeviceList` ein Suchfeld + gefilterte Liste einsetzen:

```tsx
function ReturnPage() {
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { data: loans = [], isLoading, error, refetch } = useActiveLoans()
  const { mutate: returnDevice, isPending: isReturning } = useReturnDevice()

  const filteredLoans = useMemo(() => filterLoans(loans, query), [loans, query])

  // ... handleLoanClick, handleConfirmReturn BLEIBEN unverändert ...

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Geräte zurückgeben</h1>

      {loans.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            role="searchbox"
            aria-label="Ausleihen durchsuchen"
            placeholder="Rufname oder Name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Suche zurücksetzen" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <LoanedDeviceList
        loans={filteredLoans}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onLoanClick={handleLoanClick}
      />

      {/* ... ReturnDialog BLEIBT unverändert ... */}
    </div>
  )
}
```

> Hinweis: `LoanedDeviceList` zeigt bei leerem `filteredLoans` bereits „Keine Geräte ausgeliehen". Das genügt als Kein-Treffer-Zustand für die Rückgabe (keine zusätzliche Logik nötig).

- [ ] **Step 6: Failing test für die Rückgabe-Suche**

In `apps/frontend/src/routes/loan.spec.tsx` gibt es Muster für Route-Tests; für `return` genügt ein fokussierter Render-Test. Falls keine `return.spec.tsx` existiert, neue Datei `apps/frontend/src/routes/return.spec.tsx` mit gemocktem `useActiveLoans`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

vi.mock('@/api/loans', () => ({
  useActiveLoans: vi.fn(),
  useReturnDevice: () => ({ mutate: vi.fn(), isPending: false }),
}))
import { useActiveLoans } from '@/api/loans'
import { ReturnPage } from './return' // ggf. Komponente exportieren

const mockUseActiveLoans = vi.mocked(useActiveLoans)

it('filtert Ausleihen per Suche nach Ausleiher-Name', async () => {
  mockUseActiveLoans.mockReturnValue({
    data: [
      { id: 'l1', deviceId: 'd1', borrowerName: 'Meyer', borrowedAt: '2026-07-01T10:00:00Z', device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' } },
      { id: 'l2', deviceId: 'd2', borrowerName: 'Schulze', borrowedAt: '2026-07-01T10:00:00Z', device: { id: 'd2', callSign: 'Rotkreuz 1', status: 'ON_LOAN' } },
    ],
    isLoading: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useActiveLoans>)

  render(<ReturnPage />)
  await userEvent.type(screen.getByRole('searchbox'), 'schulze')
  expect(screen.getByText('Rotkreuz 1')).toBeInTheDocument()
  expect(screen.queryByText('Florian 4-21')).not.toBeInTheDocument()
})
```

> Dafür `ReturnPage` aus `return.tsx` als benannte Komponente exportieren (`export function ReturnPage() { … }`) — die Route-Definition (`createFileRoute`) bleibt bestehen.

- [ ] **Step 7: Run tests — verify pass**

Run: `pnpm --filter @radio-inventar/frontend test:run src/lib/loan-filter.spec.ts src/routes/return.spec.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/lib/loan-filter.ts apps/frontend/src/lib/loan-filter.spec.ts apps/frontend/src/routes/return.tsx apps/frontend/src/routes/return.spec.tsx
git commit -m "feat(return): search loans by call sign + borrower name"
```

---

### Task 11: Abschluss — Typecheck & volle Testsuite

**Files:** keine neuen; Verifikation über beide Apps.

- [ ] **Step 1: Frontend Typecheck**

Run: `pnpm --filter @radio-inventar/frontend typecheck`
Expected: keine Fehler. Häufigster Fehler: übrig gebliebener `DeviceCard`/`SelectableDeviceCard`-Import in umgebauten Dateien → entfernen. `SelectableDeviceCard.tsx`/`DeviceCard.tsx` selbst bleiben vorerst liegen (ungenutzt); optional in einem Folgeschritt löschen — **nicht** in diesem Task, um den Diff fokussiert zu halten.

- [ ] **Step 2: Volle Frontend-Tests**

Run: `pnpm --filter @radio-inventar/frontend test:run`
Expected: PASS. Rot fast immer wegen alter Assertions in `DeviceList.spec`/`DeviceSelector.spec` (Grid-`data-testid`, Karten-Buttons) → an die neue Zeilen-/Gruppen-Struktur anpassen.

- [ ] **Step 3: Backend Typecheck & Tests**

Run: `pnpm --filter @radio-inventar/backend typecheck && pnpm --filter @radio-inventar/backend test src/modules/devices`
Expected: PASS.

- [ ] **Step 4: Commit (falls Anpassungen nötig waren)**

```bash
git add -A
git commit -m "test(devices): align specs and types after fast-find rework"
```

---

## Self-Review

**Spec-Abdeckung:**
- Suche (callSign/type/serial/location, normalisiert, Multi-Term-UND) → Task 3 ✓
- Status-Filter inkl. UNAVAILABLE → Task 3 + 5 ✓
- Standort-Gruppierung (dynamisch, „Ohne Standort" zuletzt, Einzelgruppe flach) → Task 3 + 7 + 8 ✓
- Sticky Filterleiste + Trefferzähler + Clear → Task 5 ✓
- Kompakte Zeilen (Übersicht + Ausleihen, Auswahl-Modus) → Task 6 + 8 + 9 ✓
- Kein-Treffer-Zustand + Reset → Task 8 (`DeviceGroupedList`) ✓
- Rückgabe: Suche Rufname + Ausleiher-Name → Task 10 ✓
- Backend `location`-Durchreichung (DTO + Service + Frontend-Schema) → Task 1 + 2 ✓
- A11y (searchbox, aria-pressed, aria-expanded, role=status) → Task 5 + 7 + 6 ✓

**Platzhalter-Scan:** keine TBD/TODO; jeder Code-Schritt zeigt vollständigen Code.

**Typ-Konsistenz:** `DeviceStatusFilter`, `DeviceLocationGroup`, `filterDevices`, `groupDevicesByLocation`, `useDeviceFilter`-Rückgabe, `DeviceRow`-Props, `DeviceGroup`-Props, `DeviceGroupedList`-Props, `filterLoans` sind über Tasks hinweg gleich benannt und verwendet. `DeviceLocationGroup` (Typ) ≠ `DeviceGroup` (Komponente) — bewusst getrennt.

**Offene Nicht-Ziele (bewusst nicht umgesetzt):** Server-Filter, opta/issi/funktion, QR-Scan, Standort in Rückgabe, Persistenz des Collapse-Zustands, Löschen der alten `DeviceCard`/`SelectableDeviceCard` (Folgeschritt).
