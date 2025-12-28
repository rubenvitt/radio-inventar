# Epic 1 Retrospektive: Projekt-Foundation & Infrastruktur

**Datum:** 2025-12-16
**Facilitator:** Bob (Scrum Master)
**Teilnehmer:** Ruben (Product Owner)

---

## Epic Summary

| Metrik | Wert |
|--------|------|
| Stories abgeschlossen | 4/4 (100%) |
| Review-Runden gesamt | 25+ |
| Tests geschrieben | 77 (Backend: 61, Frontend: 16) |
| CRITICAL Issues behoben | 15+ |
| Tech-Stack | Vite 6.4, React 19, NestJS 11, Prisma 6.x |

### Stories

| Story | Status | Review-Runden | Tests |
|-------|--------|---------------|-------|
| 1.1 Monorepo & Shared Package | done | 15 | 0 (Type-Level) |
| 1.2 Backend mit Prisma & PostgreSQL | done | 7 | 61 |
| 1.3 Frontend mit TanStack Router & Theme | done | 1 | 0 |
| 1.4 Touch-optimiertes Layout & shadcn/ui | done | 2 | 16 |

---

## Was gut lief

### Technische Erfolge

1. **Zod Schema Architektur**
   - Transform-Pipeline für nullable Strings mit DOS-Schutz
   - Type-Inference via `z.infer<typeof Schema>`
   - Shared Package zwischen Frontend und Backend

2. **Security Hardening (Backend)**
   - 7-Layer Defense: Helmet, CORS, ValidationPipe, Exception Filter, Request-ID Sanitization, Body Limits, Shutdown Hooks
   - Zero CRITICAL Issues nach finaler Review-Runde

3. **Test-Coverage**
   - 61 Backend-Tests (env.config, health.controller, prisma.service, http-exception.filter)
   - 16 Frontend-Tests (StatusBadge, DeviceCard)
   - Request-ID Sanitization: 12 dedizierte Tests

4. **Developer Experience**
   - One-Command Setup: `pnpm db:up && pnpm db:migrate && pnpm dev`
   - Hot-Reload funktioniert (Backend lokal, DB im Container)
   - TypeScript Strict Mode ohne Fehler

### Prozess-Erfolge

1. **Adversarial Code Review** deckte Edge Cases auf
2. **Story-File als Single Source of Truth** verhinderte Lost Context
3. **False Positive Deduplizierung** sparte Zeit in späteren Runden

---

## Was herausfordernd war

### Technische Herausforderungen

1. **Architecture Doc Discrepancies**
   - Prisma 7.x existiert nicht (latest: 6.x)
   - Zod 4.x in Beta, nicht production-ready
   - Lösung: Architecture.md auf tatsächliche Versionen aktualisiert

2. **Transform-Pipeline Bugs (Story 1.1)**
   - `.transform().nullable()` vs `.nullable().transform()`
   - CUID2-Länge falsch (Stack Overflow Cargo-Cult: 36 statt 24)
   - 6 CRITICAL Rounds benötigt für Edge Cases

3. **verbatimModuleSyntax Inkompatibilität**
   - NestJS CommonJS nicht kompatibel
   - 4x diskutiert, final: belassen bei false

### Prozess-Herausforderungen

1. **Review-Overhead zu hoch**
   - 25+ Runden für 4 Stories = Overkill
   - Story 1.1: 15 Runden für Shared Package
   - Viele MEDIUM/LOW Issues gefixt, die nicht nötig waren

2. **Over-Engineering Tendenz**
   - Alle Issues sollten "weg" sein
   - Keine klare Grenze: "Fix jetzt" vs "Ignorieren"

---

## Key Learnings

### 1. Security ist iterativ

- Kein "Security von Anfang" möglich
- Jede Review-Runde deckt neue Attack-Vektoren auf
- CORS allein hatte 3 Iterationen

### 2. Documentation Debt explodiert schnell

- JSDoc Inkonsistenzen über 20+ Dateien
- Story-File als Single Source of Truth hilft

### 3. Technical Debt Management

| Kategorie | Beispiele |
|-----------|-----------|
| DEFERRED | Rate Limiting (Epic 5), CSP (Frontend), Repository Pattern |
| WONTFIX | Prisma 7.x, Zod 4.x (existieren nicht) |
| KEPT | DRY Violation für Transform-Logik (Modul-Isolation) |

### 4. Review-Strategie war zu aggressiv

**Problem:** Adversarial Reviews mit 4-8 Subagents finden ALLES, aber nicht alles muss gefixt werden.

---

## Action Items für Epic 2

### Prozess-Änderungen

| Action Item | Beschreibung | Priorität |
|-------------|--------------|-----------|
| **Review-Limit** | Max 2 Review-Runden pro Story | CRITICAL |
| **Fix-Strategie** | Nur CRITICAL + HIGH (Story-relevant) fixen | CRITICAL |
| **MEDIUM/LOW** | Ignorieren oder dokumentieren als DEFERRED | HIGH |

### Neue Review-Strategie

```
REVIEW-STRATEGIE (vereinfacht):
├── CRITICAL → Fix sofort
├── HIGH     → Fix wenn Story-relevant
├── MEDIUM   → Nur wenn <5 min Aufwand
└── LOW      → Ignorieren
```

### Epic 2 Vorbereitung

| Task | Dauer | Status |
|------|-------|--------|
| Seed-Daten erstellen | 30 min | pending |
| Shared Schemas validieren | 30 min | pending |
| Query Keys Setup | 20 min | pending |

---

## Epic 2 Preview

### Stories

1. **2.1 Backend API für Geräte & Ausleihen** - GET /api/devices, GET /api/loans/active
2. **2.2 Geräte-Übersicht mit Live-Status** - DeviceGrid, StatusBadge, TanStack Query
3. **2.3 Manuelles Refresh der Übersicht** - Refresh-Button, Error Handling

### Risiken identifiziert

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| Daten-Inkonsistenz Device vs Loan | Mittel | Prisma Transactions |
| WCAG Kontrast StatusBadge | Mittel | Spezifizierte Farben aus UX-Spec |
| Stale Data nach Ausleihe | Niedrig | Manueller Refresh (FR12) |
| Fehlende Test-Daten | Mittel | Prisma Seed-Skript |

### Dependencies auf Epic 1

Alle erfüllt:
- Prisma Device/Loan Models
- TanStack Router Route `/`
- shadcn/ui Card, Button
- Tailwind Touch-Target-Klassen
- Dark Mode Support

---

## Sprint-Status Updates

```yaml
# Änderungen nach Retrospektive:
epic-1: done                    # war: in-progress
epic-1-retrospective: completed # war: optional
```

---

## Teilnehmer-Feedback

**Ruben (Product Owner):**
> "Zu viele Review-Runden. Wir sollten Wichtiges fixen, aber nicht vorarbeiten."

---

*Retrospektive durchgeführt am 2025-12-16 von Bob (Scrum Master Agent)*
