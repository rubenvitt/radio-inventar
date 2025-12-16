# Radio Inventar

Verwaltungssystem für Geräte-Inventar mit Ausleihe-Funktionen.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React 19 + TanStack (Story 1.3)
- **Shared**: Zod Schemas für Type-Safety

## Voraussetzungen

- Node.js 20 LTS (siehe `.nvmrc`)
- pnpm >= 9.0.0
- Docker (für PostgreSQL)

## Quick Start

### 1. Dependencies installieren

```bash
pnpm install
```

### 2. Datenbank starten

```bash
pnpm db:up
```

Der PostgreSQL-Container läuft auf Port 5432.

### 3. Datenbank migrieren

```bash
pnpm db:migrate
```

### 4. Backend starten

```bash
pnpm dev:backend
```

Das Backend läuft auf http://localhost:3000.

### 5. Health-Check testen

```bash
curl http://localhost:3000/api/health
```

Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-15T...",
  "database": "connected"
}
```

## Entwicklung

### Verfügbare Scripts

```bash
# Backend entwickeln
pnpm dev:backend          # Backend im Watch-Modus starten

# Datenbank verwalten
pnpm db:up                # PostgreSQL Container starten
pnpm db:down              # PostgreSQL Container stoppen
pnpm db:migrate           # Prisma Migrationen ausführen
pnpm db:studio            # Prisma Studio öffnen

# Build & Typecheck
pnpm build                # Alle Packages bauen
pnpm build:backend        # Nur Backend bauen
pnpm typecheck            # TypeScript prüfen

# Cleanup
pnpm clean                # Alle Build-Artifacts und node_modules löschen
```

### Lokale Entwicklung

**WICHTIG**: Für die lokale Entwicklung läuft:
- PostgreSQL im Docker-Container
- Backend lokal mit `pnpm dev:backend`

Backend-Container (mit Dockerfile) werden erst in späteren Stories für Production-Deployment hinzugefügt.

### Projekt-Struktur

```
radio-inventar/
├── apps/
│   └── backend/         # NestJS Backend-Service
├── packages/
│   └── shared/          # Zod Schemas & Types
├── docker-compose.yml   # PostgreSQL für lokale Entwicklung
└── pnpm-workspace.yaml  # Workspace-Konfiguration
```

## Architektur

### Backend (NestJS)

- REST API mit Express
- Prisma ORM für Datenbankzugriff
- Zod für Runtime-Validierung
- Health-Check Endpoint

### Shared Package

- Zod Schemas für Entities (Device, Loan, Borrower)
- Type-Inference für TypeScript
- Gemeinsame Types für Frontend & Backend

## Datenbank

PostgreSQL läuft im Docker-Container:
- Host: localhost
- Port: 5432
- Database: radio_inventar
- User: radio
- Password: secret (nur für lokale Entwicklung!)

## Nächste Schritte

- [ ] Story 1.3: Shared Package Publishing
- [ ] Story 1.4: Frontend-Integration
- [ ] CI/CD Pipeline einrichten
- [ ] Production Deployment Setup

## Dokumentation

Weitere Dokumentation findest du in `docs/`:
- `docs/project_context.md` - Projekt-Übersicht
- `docs/sprint-artifacts/` - Sprint-Planung und Status

## Troubleshooting

### PostgreSQL Container startet nicht

```bash
# Prüfe ob Port 5432 bereits belegt ist
lsof -i :5432

# Container neu starten
pnpm db:down
pnpm db:up
```

### Backend startet nicht

```bash
# Prüfe ob Dependencies installiert sind
pnpm install

# Prüfe ob Datenbank läuft
pnpm db:up

# Prüfe Backend-Logs
pnpm dev:backend
```

### Prisma Migration schlägt fehl

```bash
# Datenbank zurücksetzen (ACHTUNG: Alle Daten gehen verloren!)
pnpm db:down
pnpm db:up
pnpm db:migrate
```
