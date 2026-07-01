# Design: Geräte-Schnellsuche („Kommandozentrale")

**Datum:** 2026-07-01
**Status:** Freigegeben (Brainstorming abgeschlossen)
**Branch (Ausgangspunkt):** `feat/loan-thin-client`

## Problem

In allen Geräte-Ansichten (Übersicht, Ausleihen-Auswahl, Rückgabe) gibt es aktuell
**keine Suche, keinen Filter und keine Gruppierung** — nur eine nach Status bzw.
Rufname sortierte Kachel-/Listenansicht. Um „mein" Funkgerät zu finden, muss man
visuell die ganze Liste durchgehen. Im Einsatzfall (viele Geräte auf dem FüKW) ist
das zu langsam.

**Ziel:** Ein bestimmtes Funkgerät deutlich schneller finden als durch Scrollen —
über Rufname, Status und **Standort**.

## Kontext & Randbedingungen

- **Stack:** React 19, TanStack Router (file-based) + TanStack Query, Tailwind v4,
  Radix/shadcn-UI. Touch-first PWA, deutsche UI (DRK-Kontext), fixe Bottom-Nav.
- **Datenmenge:** aktuell **21 Geräte**. → Filterung vollständig **client-seitig**
  (instant, offline-tauglich, kein neuer Endpoint, kein Debounce nötig). Bleibt auch
  bei moderatem Wachstum tragfähig.
- **Gerätedaten** stammen read-only aus `radio-admin`. Die Übersicht/Ausleihen nutzen
  `useDevices()` → `DeviceWithLoanInfo` mit `callSign, serialNumber, deviceType,
  status, borrowerName?, borrowedAt?`.
- **`location` (Standort)** ist in `radio-admin` vorhanden (`RadioAdminLoanDeviceSchema`),
  wird aber im Backend-DTO (`DeviceResponseDto`) und im Frontend-Schema aktuell
  **weggeworfen**. Es ist ein **nullable Freitext**-Stammdatum (kein Enum), statisch
  (ändert sich beim Ausleihen nicht), reale Werte z. B. „Wache", „Werkstatt",
  „Lager 3", „Wache 1/2". → Standort-Gruppen müssen **dynamisch aus den echten
  Werten** abgeleitet werden, inkl. `null` → Sammelgruppe „Ohne Standort".
- **Rückgabe** nutzt `useActiveLoans()` → `ActiveLoan` mit nur
  `{ device.callSign, device.status }` + `borrowerName`. **Kein** `location`/`deviceType`
  verfügbar. Dort ist die natürliche Suche **Rufname + Ausleiher-Name**.

## Gewählter Ansatz

Ansatz **B** („Filterleiste + dichte Liste + Standort-Gruppen"): sticky Filterleiste
(Suche + Status-Chips), kompakte gut scanbare Zeilen statt großer Kacheln, nach
Standort gruppiert. **Chips als schneller Touch-Pfad** (keine Bildschirmtastatur
nötig), Suche als Ergänzung.

Entscheidungen:
- Große Kacheln werden **durch kompakte Zeilen ersetzt** (mehr Geräte pro Bildschirm).
- Standort-Gruppierung **auch in der Ausleihen-View** (hilft „eine freie vom FüKW nehmen").
- **Scope-Grenze:** nur callSign, status, location (+ Ausleiher-Name in Rückgabe).
  `opta/issi/funktion/hersteller/bedieneinheit` und QR-Scan sind **bewusst außen vor** (YAGNI).

## Architektur & Bausteine

Ein geteilter, isolierter Satz aus reiner Logik + präsentationalen Komponenten.
Übersicht und Ausleihen teilen sich Filter-Hook, Filterleiste, Zeile und Gruppe;
Rückgabe bekommt eine schlanke Variante.

### Neue Bausteine (Frontend)

1. **`src/lib/device-filter.ts`** — reine, unit-getestete Logik (keine React-Abhängigkeit):
   - `type DeviceStatusFilter = 'ALL' | 'AVAILABLE' | 'ON_LOAN' | 'UNAVAILABLE'`
     (`UNAVAILABLE` = DEFECT ∪ MAINTENANCE).
   - `normalizeSearchText(s: string): string` — lowercase, trim, Diakritika entfernen
     via `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`. Das zerlegt ä/ö/ü bereits
     zu a/o/u; **`ß` ist kein Diacritic** und wird zusätzlich explizit `ß→ss` gemappt.
     (Hinweis: „fükw"→„fukw", „FÜKW"→„fukw" — matcht also unabhängig von Umlaut-Schreibweise.)
   - `filterDevices(devices, { query, status }): DeviceWithLoanInfo[]`
     - Query wird normalisiert, an Whitespace gesplittet, **UND-verknüpft**: jeder
       Term muss in mindestens einem der Felder **callSign, deviceType,
       serialNumber, location** (jeweils normalisiert) als Substring vorkommen.
     - Status-Filter: `ALL` = alle; `AVAILABLE`/`ON_LOAN` = exakt; `UNAVAILABLE` =
       Status ∈ {DEFECT, MAINTENANCE}.
   - `groupDevicesByLocation(devices): DeviceLocationGroup[]` mit
     `DeviceLocationGroup = { key: string; label: string; devices: DeviceWithLoanInfo[] }`
     (Typ bewusst so benannt, um Kollision mit der Komponente `DeviceGroup` zu vermeiden).
     - Gruppierung nach getrimmtem `location`; leere/`null`-Werte → eine Gruppe
       `{ key: '__none__', label: 'Ohne Standort' }`, immer **zuletzt**.
     - Reihenfolge: benannte Standorte alphabetisch (`localeCompare`, de), dann „Ohne Standort".
     - Innerhalb einer Gruppe bleibt die eingehende Sortierung erhalten (Aufrufer
       liefert bereits status-/rufname-sortiert).

2. **`src/hooks/useDeviceFilter.ts`** — hält Filter-State und leitet Ergebnis ab:
   - Signatur: `useDeviceFilter(devices: DeviceWithLoanInfo[])`
   - Rückgabe: `{ query, setQuery, status, setStatus, filtered, groups, total, matchCount }`.
   - `filtered`/`groups` via `useMemo` aus `filterDevices` + `groupDevicesByLocation`.
   - `total = devices.length`, `matchCount = filtered.length`.

3. **`src/components/features/DeviceFilterBar.tsx`** — präsentational, controlled:
   - Props: `{ query, onQueryChange, status, onStatusChange, matchCount, total, className? }`.
   - Sticky (`sticky top-0 z-10 bg-background/95 backdrop-blur`), unter dem Seiten-Header.
   - Suchfeld (`ui/input`) mit Such-Icon links und Clear-„X" rechts (nur wenn `query`),
     `type="search"`, `inputMode="search"`, `aria-label="Geräte suchen"`,
     Placeholder „Rufname oder Standort…".
   - Status-Segment-Chips (Einfachauswahl): `Alle · Frei · Vergeben · Defekt·Wartung`,
     als `role="radiogroup"`, jeder Chip `aria-pressed`/`aria-checked`, Touch-Größe ≥44px.
   - Trefferzähler „{matchCount} von {total} Geräten" (bei `matchCount === total` optional
     nur „{total} Geräte"). Zusätzlich `role="status"` sr-only Live-Region.

4. **`src/components/features/DeviceRow.tsx`** — kompakte Zeile, deckt Übersicht **und**
   Ausleihen ab:
   - Props: `{ device, onClick, selected?, selectable?, disabled?, className? }`.
     - Übersicht: `selected` undefined → Klick navigiert (Aufrufer: `/loan`).
     - Ausleihen: `selected` boolean → Klick toggelt Auswahl; `selectable=false` →
       visuell deaktiviert.
   - Layout (min-h ~56–64px, ganze Zeile Touch-Ziel):
     - Links: Status-Indikator-Punkt (aus `getDeviceStatusMeta(status).indicatorClassName`).
     - Mitte: **Rufname** (fett) + Zweitzeile klein/muted: `deviceType` bzw. bei
       Ausleihe `Ausleiher · HH:MM Uhr`.
     - Rechts: `StatusBadge` (kompakt) und/oder Auswahl-Häkchen bei `selected`.
   - Reuse der bestehenden `sanitizeForDisplay`-Logik (aus DeviceCard extrahieren nach
     einem gemeinsamen Ort, z. B. `lib/sanitize.ts` falls dort passend, sonst inline
     beibehalten — nicht duplizieren).
   - `role="button"`/`role="option"` je nach Modus, Keyboard (Enter/Space), `aria-label`,
     `aria-selected`/`aria-disabled` wie in der bestehenden `SelectableDeviceCard`.
   - `memo` mit gezieltem `arePropsEqual` (analog bestehender Karten).

5. **`src/components/features/DeviceGroup.tsx`** — einklappbare Standort-Sektion:
   - Props: `{ label, count, defaultOpen?, forceOpen?, children }`.
   - Header als `<button>` mit Chevron, „📍 {label} ({count})", `aria-expanded`.
   - `forceOpen` (z. B. bei aktiver Suche) übersteuert den lokalen Collapse-State.

### Umbau bestehender Views

- **`DeviceList.tsx`** (Übersicht): `useDeviceFilter(devices)` einsetzen; `DeviceFilterBar`
  rendern; `groups` mit `DeviceGroup` + `DeviceRow` (Klick → `navigate({ to: '/loan',
  search: { deviceIds: [id] } })`, nur für verfügbare Geräte). Header (Print/Admin/Refresh)
  bleibt. Kachel-Grid entfällt.
- **`DeviceSelector.tsx`** (Ausleihen): analog mit Auswahl-Semantik; nur `AVAILABLE`
  auswählbar (`isSelectable`). Ersetzt das `SelectableDeviceCard`-Grid.
- **`return.tsx` / `LoanedDeviceList.tsx`** (Rückgabe): **schlanke** Suchleiste (nur
  Suchfeld, keine Status-Chips, keine Gruppierung). Filtert `ActiveLoan[]` client-seitig
  über **`device.callSign` + `borrowerName`** (bestehender `useMyLoans`-Ansatz als
  Vorlage, aber ohne 2-Zeichen-Mindestgrenze und zusätzlich callSign). Trefferzähler +
  Kein-Treffer-Zustand.

### Kein-Treffer-Zustand

Wenn `matchCount === 0` bei nicht-leerem Filter: freundlicher Hinweis „Keine Treffer
für ‚{query}'" + Button „Filter zurücksetzen" (`onQueryChange('')` + `onStatusChange('ALL')`).
Leerer Ausgangszustand (0 Geräte im System) bleibt wie bisher.

### Edge Cases

- **Nur eine Gruppe** (oder alle `location = null`): flach **ohne** Gruppen-Header
  rendern (`groups.length <= 1`).
- **Aktive Suche + Gruppen**: alle sichtbaren Gruppen `forceOpen`, Gruppen mit 0
  Treffern ausblenden.
- **Unbekannter Status** in Daten: `StatusBadge` fängt das bereits ab; Filter behandelt
  unbekannt als nicht in `AVAILABLE/ON_LOAN/UNAVAILABLE` (fällt bei spezifischem Filter raus).

## Backend-Durchreichung (einzige Backend-Änderung)

1. `apps/backend/src/modules/devices/dto/device-response.dto.ts`: Feld
   `location: string | null` ergänzen (+ `@ApiProperty`).
2. `apps/backend/src/modules/devices/devices.service.ts` (≈ Zeile 30–36): `location:
   device.location` ins `.map()` aufnehmen.
3. `apps/frontend/src/api/devices.ts`: `location: z.string().nullable()` in
   `DeviceApiSchema`; `DeviceWithLoanInfo` erbt es automatisch (Interface ergänzen falls
   nötig). `location` durch die `useDevices`-Kombinationslogik durchreichen.

**Kein** neuer Endpoint, **kein** Server-seitiges Filtern. Rückgabe-View braucht **keine**
Backend-Änderung (Standort dort nicht gefordert).

## Tests

- **`device-filter.spec.ts`** (Kern, umfangreich):
  - Query-Matching gegen callSign/deviceType/serialNumber/location.
  - Normalisierung: Groß/Klein, Umlaute/Diakritika („fükw" ↔ „FueKW"/„FÜKW"), Trim.
  - Multi-Term-UND („florian lager").
  - Status-Filter inkl. `UNAVAILABLE` (DEFECT ∪ MAINTENANCE).
  - Gruppierung: alphabetisch, „Ohne Standort" zuletzt, `null`/leere Strings,
    Einzelgruppen-Fall.
- **Komponententests:** `DeviceFilterBar` (Tippen, Clear-X, Chip-Wechsel, Zähler),
  `DeviceRow` (Klick/Keyboard, `selected`, `disabled`/nicht-auswählbar, Statuspunkt),
  `DeviceGroup` (Auf-/Zuklappen, `forceOpen`).
- **Angepasst:** bestehende `DeviceList.spec`, `DeviceSelector.spec`,
  `LoanedDeviceList.spec` (Layout-Wechsel + Suche).
- **Backend:** `devices.service.spec` — `location`-Durchreichung (inkl. `null`).

## Nicht-Ziele (bewusst ausgeschlossen)

- Server-seitige Suche/Pagination, neue Endpoints.
- Zusätzliche Suchfelder (opta/issi/funktion/hersteller/bedieneinheit).
- QR-/Barcode-Scan zum Direktsprung.
- Standort in der Rückgabe-View (Daten nicht verfügbar; nicht gefordert).
- Persistenz des Collapse-/Filter-Zustands über Reloads (localStorage) — späteres Nice-to-have.
