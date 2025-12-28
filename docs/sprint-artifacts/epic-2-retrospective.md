# Epic 2 Retrospektive - Geräte-Übersicht & Live-Status

**Datum:** 2025-12-17
**Facilitator:** Bob (Scrum Master)
**Teilnehmer:** Ruben (Project Lead), John (PM), Winston (Architect), Amelia (Developer), Murat (Test Architect)

---

## Epic Summary

| Metrik | Wert |
|--------|------|
| Epic | 2: Geräte-Übersicht & Live-Status |
| Stories | 3/3 abgeschlossen (100%) |
| Tests | 282 (Backend + Frontend) |
| TypeScript Errors | 0 |
| Review-Runden | ~10 (avg 3.3 pro Story) |
| FRs delivered | FR10, FR11, FR12, FR13 |

**Stories:**
- 2.1: Backend API für Geräte & Ausleihen ✅
- 2.2: Geräte-Übersicht mit Live-Status ✅
- 2.3: Manuelles Refresh der Übersicht ✅

---

## Was gut lief

### 1. Repository Pattern erfolgreich eingeführt
- Controller → Service → Repository → Prisma
- Bessere Testbarkeit, klare Separation of Concerns
- Tests wuchsen von 73 auf 109

### 2. Zod API Response Validation etabliert
- Runtime Type Safety trotz TypeScript
- Defensive Programming gegen fehlerhafte Backend-Daten
- Pattern in devices.ts und loans.ts angewendet

### 3. Touch-optimierte CSS Utilities
- Single Source of Truth in `globals.css`
- `.touch-target-sm/md/lg/xl` Klassen
- Tailwind Purge-Problem gelöst (keine dynamischen Klassen)

### 4. DRY Error Messages
- `getUserFriendlyErrorMessage()` zentral in `lib/error-messages.ts`
- 8 dedizierte Tests
- Wiederverwendung in DeviceList und ErrorState

### 5. Security iterativ verbessert
- Rate Limiting hinzugefügt (DoS-Schutz via @nestjs/throttler)
- XSS Sanitization mit Unicode/RTL Filtering
- Pagination gegen Unbounded Queries (MAX_PAGE_SIZE=500)

### 6. DEFERRED-Items klar dokumentiert
- Nicht "später", sondern "Epic 4+, weil i18n fehlt"
- Kategorisiert: Infrastructure, Architecture, Epic-spezifisch

---

## Herausforderungen

### 1. Review-Overhead
| Story | Review-Runden | Ziel (max 2) |
|-------|---------------|--------------|
| 2.1 | 5 | ❌ |
| 2.2 | 2 | ✅ |
| 2.3 | 3+ | ❌ |

**Verbesserung zu Epic 1:** Von avg 6 Runden auf 3.3, aber Commitment nicht erfüllt.

### 2. Wiederkehrende Probleme (in 2+ Stories)
- Console Statements in Production (Information Disclosure)
- XSS/Sanitization-Lücken (auch in aria-labels)
- DRY Violations über Dateien hinweg
- Test Mock Inconsistency (global.fetch vs apiClient)

### 3. Adversarial Reviews weiterhin zu aggressiv
- Epic 1 Erkenntnis: "zu aggressiv, findet ALLES"
- Epic 2 Realität: Weiterhin 4 parallele Subagents
- Story 2.3 hatte 50 Issues in einer Runde

---

## Epic 1 Action Items - Follow-Up

| Action Item | Status |
|-------------|--------|
| Max 2 Review-Runden | ⚠️ Teilweise (3.3 statt 6) |
| Nur CRITICAL + HIGH fixen | ✅ Umgesetzt |
| Story-File als Single Source of Truth | ✅ Umgesetzt |
| Seed-Daten erstellen | ✅ Erledigt |
| Query Keys Setup | ✅ Erledigt |

---

## Key Learnings

1. **Security-First Approach:** DoS Prevention, XSS Sanitization, Information Disclosure von Anfang an einplanen
2. **DRY über Dateien hinweg:** Constants, Schemas, Error Messages zentral definieren
3. **Repository Pattern:** Backend MUSS Repository-Schicht haben für Testbarkeit
4. **Accessibility von Anfang an:** ARIA, Keyboard Navigation, Touch-Targets nicht als Nachbesserung
5. **Test Quality über Quantität:** Lieber weniger Tests ohne False Positives

---

## Technical Debt

### Aus Epic 2 entstanden

**Backend:**
- [ ] Business logic in LoansService (thin pass-through) - MEDIUM
- [ ] Pagination constants in env/config - LOW
- [ ] Response caching für Performance - LOW

**Frontend:**
- [ ] i18n Infrastruktur (hardcoded deutsche Strings) - LOW (Epic 4+)
- [ ] 3 skipped Vitest Timer Tests - MEDIUM
- [ ] Monitoring für Silent Loan Failures - MEDIUM
- [ ] Business Logic aus Query Hooks in Service Layer - MEDIUM

### Aus Epic 1 weiterhin offen
- [ ] CSP Headers (Frontend) - LOW
- [ ] Prisma Transactions (Epic 3) - HIGH

---

## Epic 3 Vorbereitung

### Abhängigkeiten (alle erfüllt ✅)
- DeviceCard, DeviceList, StatusBadge Komponenten
- useDevices(), useActiveLoans() Hooks
- API Client, TanStack Query Setup
- Prisma Device/Loan Models

### Kritische Risiken

| Risiko | Impact | Mitigation |
|--------|--------|-----------|
| Race Condition (parallele Ausleihen) | Doppelte Ausleihe | Prisma Transaction + Unique Constraint |
| Optimistic UI Rollback | Inkonsistente UI | Snapshot + separate Rollback-Logik |
| Autocomplete Performance | > 500ms Response | Index + LIMIT 10 + Debouncing |

### Neue Anforderungen
- POST /api/loans Endpoint
- BorrowersModule (Autocomplete)
- Route `/loan`
- Optimistic UI mit Rollback

---

## Action Items

### Prozess-Verbesserungen

| # | Action Item | Owner | Priorität |
|---|-------------|-------|-----------|
| 1 | Pre-Review Checklist erstellen (Console.log, XSS, ARIA) | Amelia | HIGH |
| 2 | Review-Budget: Max 8h statt "Max 2 Runden" (messbar) | Bob | HIGH |
| 3 | Single-Reviewer erste Runde, dann Multi-Agent | Bob | MEDIUM |

### Technical Debt

| # | Item | Priorität |
|---|------|-----------|
| 4 | Vitest Timer Tests fixen (3 skipped) | MEDIUM |
| 5 | i18n-Vorbereitung (hardcoded Strings) | LOW (Epic 4+) |
| 6 | Monitoring für Silent Loan Failures | MEDIUM |

### Epic 3 Vorbereitung

| # | Task | Owner | Dauer |
|---|------|-------|-------|
| 7 | Prisma Transaction Pattern dokumentieren | Winston | 30 min |
| 8 | CreateLoanDto in @radio-inventar/shared | Amelia | 20 min |
| 9 | Route `/loan` Template erstellen | Amelia | 10 min |
| 10 | Toast Library entscheiden (shadcn/ui) | Amelia | 15 min |
| 11 | **Realistische Testgeräte anlegen** | Amelia | 30 min |

**Details zu #11 (Testgeräte):**
- 10-15 Geräte mit echten Rufnamen (Florian 4-11 bis 4-25)
- Mix aus Status: AVAILABLE, ON_LOAN, MAINTENANCE
- Verschiedene Gerätetypen (HRT, MRT)
- 5-8 verschiedene Borrower-Namen für Autocomplete-Tests
- Aktive Ausleihen mit unterschiedlichen Zeitstempeln

---

## Nächste Schritte

1. **Epic 3 Vorbereitung abschließen** (Tasks 7-11)
2. **Pre-Review Checklist** vor erster Story 3.x Review erstellen
3. **Epic 3 starten** mit Story 3.1 (Backend API)

---

## Team Feedback

**Ruben (Project Lead):** "Musste zwar Fehler fixen, aber jetzt passt es."

**Fazit:** Epic 2 war erfolgreich mit 100% Story-Completion und solider Test-Abdeckung. Review-Overhead bleibt ein Thema, wurde aber von Epic 1 (avg 6 Runden) auf Epic 2 (avg 3.3 Runden) reduziert. Fokus für Epic 3: Messbare Review-Limits und realistische Testdaten.

---

*Retrospektive durchgeführt am 2025-12-17*
