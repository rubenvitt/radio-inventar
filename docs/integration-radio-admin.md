# Integration: radio-inventar → radio-admin (Geräte read-only beziehen)

**Status:** Implementierung fertig & verifiziert (außer e2e-Rewrite + Auth-Spike, s. u.)
**Entscheidung:** Ansatz C – Plain (In-Memory-Cache, keine lokale Geräte-Tabelle)

## Verifikation (Stand: vollständige Umsetzung)
- **radio-admin:** 353 vitest, tsc (server+shared), eslint — grün.
- **radio-inventar shared:** 37 vitest, build — grün.
- **radio-inventar backend:** 527 Unit-Tests, tsc 0 Fehler — grün. (Prisma-Migration angewendet,
  Partial-Unique-Index aktiv.)
- **radio-inventar frontend:** 966 vitest grün (tsc 0 echte Fehler). 2 vorbestehende Fehler in
  `DashboardStatsCards.spec` (per git-stash als Baseline-Fehler bestätigt, lucide-react-Version) — NICHT
  von dieser Änderung.
- **OFFEN:** (1) **e2e-Specs** (`apps/backend/test/*.e2e-spec.ts`) sind durch den Schema-Reset gebrochen
  (seeden die alte Device-Tabelle / nutzen entfernte CRUD-Endpunkte); separater Runner (`jest-e2e.json`,
  `test:e2e`), aus tsc + Unit-`jest` ausgeschlossen → NICHT ausgeführt, brauchen eigenen Rewrite-Pass.
  (2) **Auth-Spike** (echtes client_credentials-Token, aud/sub) vor Scharfschalten der JWT-Validierung.

## Fortschritt (verifiziert)
- ✅ **radio-admin Phase 1** — Loan-API-Projektion um `id` + `serialNumber` erweitert
  (`server/src/routes/loanApi.ts`); JWT-Auth (Issuer+Audience+optional Subject) via
  `server/src/auth/loan-api-jwt.ts` (jose, injizierbarer Key-Resolver); Guard akzeptiert
  JWT **oder** api-token (`requireLoanApiAuth`); Config `LOAN_API_EXPECTED_AUDIENCE`/
  `LOAN_API_EXPECTED_SUBJECT`; `.env.example` dokumentiert. **353/353 vitest, tsc+eslint grün.**
- ✅ **shared (additiv)** — `RadioAdminLoanDeviceSchema` + `mapRadioAdminStatus` in
  `packages/shared/src/schemas/radio-admin-device.schema.ts` (+ index-Export). **37/37 vitest, build grün.**
- ✅ **backend RadioAdminService (additiv)** — `apps/backend/src/modules/radio-admin/*`
  (client_credentials Token-Cache + Discovery + TTL-Device-Cache + Stale-Grace, Zod-validiert);
  Env `RADIO_ADMIN_URL/ISSUER_URL/CLIENT_ID/CLIENT_SECRET/CACHE_TTL_MS` (all-or-nothing) in
  `env.config.ts`; `RadioAdminModule` (@Global) in `app.module.ts`; `.env.example` ergänzt.
  **7/7 jest, backend tsc clean.** (Noch nirgends konsumiert → nichts gebrochen.)

### Offen (breaking Refactor, braucht laufendes Postgres)
Phase 3 (Prisma-Reset + Snapshots + Partial-Unique-Index), Phase 5 (loans), Phase 6 (devices),
Phase 7 (history/dashboard), Phase 8 (admin/devices Entfall + Frontend read-only). Siehe unten.

## Spike (Auth) — TEILWEISE, ein Punkt bleibt OFFEN/BLOCKING für die Auth-Aktivierung
Verifiziert: Pocket ID (`https://id.iuk-ue.de`) stellt **echte JWTs** aus (kein opakes Token) →
JWKS-Validierung ist der richtige Weg.
ABER: Das beobachtete Token (`iss=https://id.iuk-ue.de`, `aud=[<client-id>]`, `sub=<user-uuid>`,
mit groups/email) stammt aus einem **User-Login (authorization_code)**, NICHT aus client_credentials.
Das `aud`/`sub` eines **M2M-Tokens** ist damit UNVERIFIZIERT. Provider setzen bei client_credentials
`aud` unterschiedlich (client_id / issuer / `resource`-Param / gar nicht). Unser `requestToken()`
sendet nur grant_type+client_id+client_secret (kein resource/audience) → falls Pocket ID `aud` nur
auf Anfrage setzt, fehlt es. **Folge:** `verifyLoanJwt` gated auf `aud` (jose `jwtVerify({audience})`
wirft bei Mismatch/Fehlen) → ohne korrektes `aud` → 401 auf jeden Fetch. Das wäre dann KEIN
Config-Fix, sondern Code-Rework (audience-Option droppen, auf issuer+`sub` gaten).
**Diskriminierender Check (vor Auth-Aktivierung):** neuen radio-inventar-Service-Client in Pocket ID
anlegen, echtes client_credentials-Token ziehen (`POST /api/oidc/token`), `aud`/`sub` dekodieren.
- `aud` = stabile client_id → `LOAN_API_EXPECTED_AUDIENCE` setzen (aktuelles Design passt).
- `aud` fehlt/instabil → Guard in radio-admin auf issuer + `sub` (`client-<id>`) umstellen.
Der loanApiJwt-Test prüft nur interne Konsistenz (mintet aud=AUD), NICHT die Realität.

## Runtime-Verifikation (gegen echtes Postgres + Boot)
- **Boot:** `nest start` → „Nest application successfully started"; `GET /api/health` → 200
  `{status:ok, database:connected}`. Die echte AppModule-DI-Auflösung (AdminModule→DevicesModule,
  @Global RadioAdminModule, HistoryRepository(RadioAdminService)) funktioniert zur Laufzeit.
- **Partial-Unique-Index (Atomarität):** Roh-SQL bestätigt — zweite AKTIVE Ausleihe desselben Geräts
  → `duplicate key ... loans_device_active_uidx`; nach Rückgabe wieder erlaubt (genau 1 aktiv).
- **Fresh-Apply:** Migration sauber auf leerer Scratch-DB appliziert (Loan mit Snapshots +
  Partial-Index, kein Device-Table). `prisma migrate reset` braucht User-Consent → nicht genutzt;
  Scratch-DB-Deploy ist äquivalent und non-destruktiv.

## Konfig-Posture (Entscheidung offen, klein)
`RADIO_ADMIN_*` ist aktuell **optional** (all-or-nothing). `fetchLoanableDevices()` guardet jetzt auf
`isEnabled()` → bei fehlender Konfiguration klares 503 statt Discovery gegen leere URL. Da radio-admin
die EINZIGE Geräte-Quelle ist, wäre **required + fail-fast beim Boot** die ehrlichere Posture (sonst
booten ok, aber Geräte/Loan/Dashboard-Requests 503en). Bewusst optional gelassen, damit Dev/e2e ohne
die Vars booten — bei Bedarf in `validateEnv` required machen.

## Code-Review (Phase 6, Multi-Agent + adversarielle Verifikation)
5 Reviewer × Dimensionen → 10 Funde, 9 verifiziert (1 widerlegt). Behoben (Set #1–#4 + Cleanup):
- **HIGH** React-Query-Key-Kollision: `useDevicesForFilter` teilte `adminDeviceKeys.list(undefined)` mit
  `useAdminDevices`, aber andere Form → Geräte „Unbekannt"/leer für 30s bei Reihenfolge history→devices.
  Fix: gleicher queryFn (`fetchAdminDevices`) + `select`-Projektion auf {id,callSign}; dupliziertes
  `DevicesFilterResponseSchema` entfernt.
- **MEDIUM** Snapshot-Spalten → `TEXT` (Migration `20260627170000_widen_loan_snapshots_to_text`): kein
  VARCHAR-Overflow (22001 → 500 → unausleihbar) mehr bei langem rufname.
- **MEDIUM** `seed.ts` neu (kein `prisma.device` mehr; Loans mit Snapshot-Pflichtfeldern) — `prisma db seed`
  läuft wieder (verifiziert).
- **MEDIUM** `radio-admin/config.ts`: HTTPS-Pflicht für `OIDC_ISSUER` in Prod (neuer JWT-Trust-Anchor).
- **Cleanup**: toter Code `getDeviceErrorMessage`/`DEVICE_API_ERRORS` entfernt.

Bewusst offen gelassen (LOW, post-merge): Token-Cache-Resilienz (Fallback auf gültiges Token bei
Refresh-Fehler; `tokenCache` bei 401 leeren). Migration nur Fresh-DB → Doku (s. o.).

## Bekannte To-dos für die Folge-Session
- **e2e-Specs** (`apps/backend/test/*.e2e-spec.ts`) durch den Schema-Reset gebrochen (seeden die alte
  Device-Tabelle / nutzen entfernte CRUD-Endpunkte). Separater Runner (`jest-e2e.json`, `test:e2e`),
  aus tsc + Unit-`jest` ausgeschlossen → NICHT ausgeführt. Überwiegend Test-Rework (Suiten groß:
  admin-devices ~48 KB, loans ~46 KB, admin-history ~41 KB) — eigene Session einplanen.
- **Auth-Spike** (s. o.) vor Scharfschalten der JWT-Validierung.
- Vorbestehend (nicht von dieser Änderung): `DashboardStatsCards.spec` 2 Tests rot (lucide-react),
  per git-stash als Baseline bestätigt.

## Umgebungs-Notizen (Setup-Gotchas)
- **radio-admin:** `better-sqlite3` muss für Node 24 aus Source gebaut werden
  (`cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx node-gyp rebuild`),
  sonst NODE_MODULE_VERSION-Mismatch in vitest.
- **radio-inventar:** nach `pnpm install` zwingend `pnpm --filter @radio-inventar/backend exec prisma generate`,
  sonst fehlen `@prisma/client`-Typen (Device/AdminUser/Prisma.*) → tsc-Fehler. Eigenes Postgres läuft
  nicht automatisch: `pnpm db:up` (docker-compose, Port 5432). Lint ist NICHT konfiguriert (root-`lint` = echo).
- Vorbestehende Doku-Lücke: `apps/backend/.env.example` listet `API_TOKEN`/`SESSION_SECRET` (beide Pflicht) nicht.

## Ziel
radio-inventar betreibt KEINE eigene Geräte-Datenhaltung mehr. Die ausleihbaren
Funkgeräte (`loanable = true`) werden aus radio-admin (Master) bezogen. Ausleihen
(Loans) bleiben lokal in radio-inventar.

## Fixe Entscheidungen
1. radio-admin darf angepasst werden (additive Loan-API-Erweiterung).
2. Reset möglich – keine Migration von Altdaten.
3. Gerätezustand (DEFECT/MAINTENANCE) wird ausschließlich in radio-admin gepflegt;
   radio-inventar zeigt Geräte read-only.
4. S2S-Auth: OAuth2 client_credentials via Pocket ID (kein statischer API-Token für
   den radio-inventar-Call). radio-admin validiert Issuer + Audience + Subject.

## Verifizierte Fakten
- radio-admin `device.id` = cuid2 (`@paralleldrive/cuid2`, 24 lc-alnum) → passt
  unverändert in radio-inventars `Loan.deviceId` (`VARCHAR(25)`, Regex
  `/^[a-z0-9]{24,32}$/`, `z.string().cuid2()`). **Keine** Validator-/Spaltenänderung.
- `jose ^5.9.0` ist bereits direkte Dependency in radio-admin `server/package.json`.
- radio-admin Loan-API ist bereits vor dem Session-Guard gemountet (`app.ts`).
- radio-admin `status` ist FREITEXT (kein Enum). `listLoanableDevices` filtert NICHT
  nach status → ein defektes loanable-Gerät erscheint in der API.
- radio-admin `rufname` ist nullable → Fallback `callSign = rufname ?? issi`.

## Kern-Architektur (C-Plain)
- **Geräteliste:** `RadioAdminService.fetchLoanableDevices()` – native fetch gegen
  `GET {RADIO_ADMIN_URL}/api/v1/loan-devices`, Bearer-Token aus client_credentials,
  Zod-validiert. In-Memory-Cache: 30s TTL + 5 Min Stale-Grace + fetchPromise-Dedup.
  Bei Ausfall ohne Cache → 503 (Browse + Loan-Create); Return/History bleiben lokal.
- **Status-Komposition** (`mapRadioAdminStatus(raStatus, hasActiveLoan)`):
  - `hasActiveLoan` → `ON_LOAN` (aus lokalen aktiven Loans, überschreibt alles)
  - `raStatus` (lower/trim) `'defekt'` → `DEFECT`, `'wartung'` → `MAINTENANCE`
  - sonst → `AVAILABLE`
- **Atomarität:** Partial-Unique-Index `loans_device_active_uidx ON "Loan"(deviceId)
  WHERE "returnedAt" IS NULL` (hand-editiert in der Migration; `IF NOT EXISTS`).
  Ausleihe = reines `loan.create`; P2002 → 409 (DEVICE_JUST_LOANED). Kein
  SELECT-then-CAS, kein device.update mehr.
- **Snapshots auf Loan:** `snapshotCallSign` (VARCHAR50, NOT NULL),
  `snapshotSerialNumber` (VARCHAR100, null), `snapshotDeviceType` (VARCHAR100, NOT NULL).
  History/Dashboard/CSV lesen daraus; `device`-Subobjekt wird serverseitig
  rekonstruiert → bestehender API-Contract bleibt stabil.

## Auth-Verdrahtung
- **radio-inventar (outbound):** `RadioAdminService.getAccessToken()` – POST
  `{POCKET_ID_ISSUER_URL}/api/oidc/token` mit `grant_type=client_credentials` +
  client_id/secret. Token-Cache (Refresh 60s vor Ablauf, tokenPromise-Dedup).
- **radio-admin (inbound):** neue `verifyLoanJwt` (jose `createRemoteJWKSet` +
  `jwtVerify`) prüft Issuer + Audience + Subject (`client-<clientid>`). Guard auf
  `/v1/loan-devices`: JWT zuerst, optional api_token-Fallback.
- **Audience:** `LOAN_API_EXPECTED_AUDIENCE` = der von Pocket ID emittierte aud-Claim
  (deploy-zeitig, im Spike empirisch bestimmt).

## ⚠️ BLOCKING Spike 0 (vor jeglichem Auth-Code)
radio-inventar als Client in Pocket ID anlegen, client_credentials-Token holen,
dekodieren und prüfen: Ist es ein JWT? Welche `aud`/`sub`-Werte? → legt
`LOAN_API_EXPECTED_AUDIENCE` + `LOAN_API_EXPECTED_SUBJECT` fest. Falls das Token
opak (kein JWT) ist, muss der radio-admin-Guard auf Introspection statt JWKS
umgestellt werden.

```bash
curl -s -X POST "$POCKET_ID_ISSUER_URL/api/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"
# access_token nehmen, Payload dekodieren (zweites JWT-Segment base64url) → aud/sub prüfen
```

## Build-Reihenfolge (TDD je Schritt; eslint no-explicit-any; gates direkt prüfen)
0. **Spike 0** (Auth-Token-Format) – blocking nur für Auth-Teile.
1. **radio-admin** (kein Drizzle-Migration nötig): `loanApi.ts` LoanDevice +
   `toLoanDevice()` um `id` + `serialNumber` erweitern; `verifyLoanJwt` (jose);
   Guard `requireJwtOrApiToken`; `config.ts` LOAN_API_* Felder. Bestehende
   api_token-Tests grün halten.
2. **shared:** `RadioAdminLoanableDeviceSchema` + `mapRadioAdminStatus` ergänzen;
   `HistoryItemSchema`/`DashboardStatsSchema` aus Snapshots befüllen (Shape stabil);
   Admin-CRUD-Device-Schemas @deprecated. cuid2-Validatoren NICHT anfassen.
3. **radio-inventar Prisma-Reset:** Device-Modell + DeviceStatus-Enum entfernen,
   FK Loan→Device entfernen, Snapshot-Spalten ergänzen, deviceId VARCHAR(25) bleibt.
   `prisma migrate dev --create-only` → SQL hand-editieren (DROP TABLE/TYPE/CONSTRAINT,
   ADD COLUMNs NOT NULL DEFAULT '' dann DROP DEFAULT, CREATE UNIQUE INDEX … WHERE
   returnedAt IS NULL) → anwenden + generate. env.config.ts RADIO_ADMIN_* (all-or-nothing).
4. **RadioAdminService + Module** (Muster `pocket-id.service.ts`): Token-Cache,
   Device-Cache (TTL+Grace+Dedup), Zod, kein any. Unit-Tests.
5. **loans:** `create()` Device aus Cache (404), DEFECT/MAINTENANCE→409, Snapshot-Write,
   P2002→409; `returnLoan()` ohne device.update; `findActive()` device-Subobjekt aus
   Snapshots. Tests (Race, 404/409).
6. **devices:** `DevicesService` auf RadioAdminService + Active-Loan-Overlay;
   `devices.repository.ts` löschen; Controller-DTO auf Remote-Shape.
7. **history/dashboard:** `getHistory()` ohne JOIN (Snapshots); `getDashboardStats()`
   hybrid (onLoanCount lokal; defect/maint/available aus Cache, bei Ausfall 0 +
   degraded-Flag); CSV serialNumber aus Snapshot; PrintTemplateService auf RadioAdminService.
8. **admin aufräumen:** admin/devices Controller/Service/Repo + CRUD-DTOs löschen,
   GET read-only behalten; Frontend: DeviceFormDialog/DeviceDeleteDialog löschen,
   CRUD-Mutationen raus, `routes/admin/devices.tsx` read-only + Info-Banner.
9. **Integration/Verifikation:** E2E Happy-Path (gemockter radio-admin, Snapshots
   korrekt), Race-Test (2× parallel → 1×200/1×409), Degraded (radio-admin stoppen),
   Dashboard offline (counts 0 + Flag). In beiden Repos: `tsc --noEmit`, eslint, build grün.

## Gemeinsame Risiken / Notizen
- Partial-Unique-Index ist für `schema.prisma` unsichtbar → `prisma db push` verbieten,
  Drift in `prisma migrate status` dokumentieren, `IF NOT EXISTS` verwenden.
- Freitext-Status-Mapping bricht still bei Umbenennung in radio-admin (z.B.
  „Defekt"→„Ausgefallen") → dokumentieren/monitoren.
- radio-admin Projektion + Guard-Umbau müssen additiv/rückwärtskompatibel bleiben.
