# Radio Inventar

Ein modernes, touch-optimiertes Verwaltungssystem für Funkgeräte-Inventar mit Ausleihe-Funktionen. Entwickelt für den Einsatz bei Feuerwehren, THW und anderen Organisationen mit BOS-Funk.

## Features

- **Geräte-Übersicht**: Echtzeit-Status aller Funkgeräte auf einen Blick
- **Ausleihe-System**: Schnelle Ausleihe mit Namens-Autocomplete
- **Rückgabe**: Einfache Rückgabe mit optionaler Notiz
- **Admin-Bereich**: Geräteverwaltung, Dashboard und Historie
- **PDF-Export**: Druckbare Geräteliste mit QR-Codes
- **CSV-Export**: Historien-Export für Auswertungen
- **Mobile-First**: Touch-optimierte Oberfläche für Tablets und Smartphones
- **Dark/Light Mode**: Automatische Anpassung an System-Einstellungen

## Schnellstart

### Voraussetzungen

- **Node.js** 24 LTS (siehe `.nvmrc`)
- **pnpm** >= 9.0.0
- **Docker** und Docker Compose

### Installation

```bash
# Repository klonen
git clone https://github.com/rubenvitt/radio-inventar.git
cd radio-inventar

# Dependencies installieren
pnpm install

# Datenbank starten
pnpm db:up

# Datenbank migrieren
pnpm db:migrate

# Entwicklungsserver starten (Backend + Frontend)
pnpm dev
```

Nach dem Start ist verfügbar:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health-Check**: http://localhost:3000/api/health

### Erste Einrichtung

1. Öffne http://localhost:5173
2. Beim ersten Start wirst du zur Token-Konfiguration weitergeleitet
3. Setze das API-Token (muss mit `API_TOKEN` in der Backend-Konfiguration übereinstimmen)
4. Erstelle einen Admin-Benutzer unter `/setup`

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| **Monorepo** | pnpm Workspaces |
| **Backend** | NestJS 11, Express 5, Prisma 6 |
| **Frontend** | React 19, TanStack Router/Query/Form |
| **Datenbank** | PostgreSQL 16 |
| **UI** | shadcn/ui, Tailwind CSS 4, Radix UI |
| **Validierung** | Zod (shared zwischen Frontend & Backend) |
| **Build** | Vite 6, TypeScript 5.7 |
| **Testing** | Vitest (Frontend), Jest (Backend) |
| **CI/CD** | GitHub Actions |
| **Container** | Docker, Docker Compose |

## Projekt-Struktur

```
radio-inventar/
├── apps/
│   ├── backend/              # NestJS REST API
│   │   ├── src/
│   │   │   ├── modules/      # Feature-Module
│   │   │   ├── common/       # Guards, Decorators, Pipes
│   │   │   └── config/       # Konfiguration
│   │   └── prisma/           # Datenbankschema & Migrationen
│   └── frontend/             # React SPA
│       ├── src/
│       │   ├── routes/       # File-based Routing
│       │   ├── components/   # UI-Komponenten
│       │   ├── api/          # API-Client
│       │   └── lib/          # Utilities
│       └── public/           # Statische Assets
├── packages/
│   └── shared/               # Geteilte Zod-Schemas & Types
├── docs/                     # Projekt-Dokumentation
├── docker-compose.yml        # PostgreSQL + Backend
└── pnpm-workspace.yaml       # Workspace-Konfiguration
```

## Verfügbare Scripts

### Entwicklung

```bash
pnpm dev              # Alle Services parallel starten
pnpm dev:backend      # Nur Backend (Port 3000)
pnpm dev:frontend     # Nur Frontend (Port 5173)
```

### Datenbank

```bash
pnpm db:up            # PostgreSQL Container starten
pnpm db:down          # PostgreSQL Container stoppen
pnpm db:migrate       # Prisma Migrationen ausführen
pnpm db:studio        # Prisma Studio öffnen (GUI)
```

### Build & Test

```bash
pnpm build            # Alle Packages bauen
pnpm typecheck        # TypeScript-Prüfung
pnpm test             # Tests ausführen
pnpm test:backend     # Backend-Tests
pnpm test:frontend    # Frontend-Tests
```

### Cleanup

```bash
pnpm clean            # Build-Artifacts und node_modules löschen
```

## Konfiguration

### Backend (.env)

Erstelle `apps/backend/.env` basierend auf `.env.example`:

```bash
# Anwendung
NODE_ENV=development
PORT=3000

# Datenbank
DATABASE_URL=postgresql://radio:secret@localhost:5432/radio_inventar

# CORS (kommasepariert)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001

# Session-Sicherheit (min. 32 Zeichen, in Production ändern!)
SESSION_SECRET=your-super-secret-session-key-change-me

# API-Token für Frontend-Authentifizierung (min. 32 Zeichen)
API_TOKEN=your-api-token-min-32-characters-long

# Öffentliche URL für QR-Codes (HTTPS in Production erforderlich)
PUBLIC_APP_URL=http://localhost:5173
```

### Frontend (.env)

Erstelle `apps/frontend/.env` basierend auf `.env.example`:

```bash
VITE_API_URL=http://localhost:3000/api
```

## API-Endpunkte

### Öffentlich (mit API-Token)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/health` | Health-Check |
| `GET` | `/api/devices` | Geräteliste |
| `GET` | `/api/devices/print-template` | PDF mit QR-Codes |
| `GET` | `/api/loans/active` | Aktive Ausleihen |
| `POST` | `/api/loans` | Neue Ausleihe |
| `PATCH` | `/api/loans/:id` | Rückgabe |
| `GET` | `/api/borrowers/suggestions` | Namensvorschläge |
| `GET` | `/api/setup/status` | Setup-Status |
| `POST` | `/api/setup` | Admin erstellen |

### Admin (Session-Auth)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `POST` | `/api/admin/auth/login` | Anmelden |
| `POST` | `/api/admin/auth/logout` | Abmelden |
| `GET` | `/api/admin/auth/session` | Session prüfen |
| `GET` | `/api/admin/devices` | Geräte (Admin) |
| `POST` | `/api/admin/devices` | Gerät erstellen |
| `PATCH` | `/api/admin/devices/:id` | Gerät bearbeiten |
| `DELETE` | `/api/admin/devices/:id` | Gerät löschen |
| `GET` | `/api/admin/history` | Ausleihe-Historie |
| `GET` | `/api/admin/history/export/csv` | CSV-Export |

## Deployment

Für detaillierte Deployment-Anleitungen siehe [docs/deployment.md](docs/deployment.md).

### Quick Deploy mit Docker Compose

```bash
# Mit Docker Compose (Backend + PostgreSQL)
docker-compose --profile full-app up -d

# Umgebungsvariablen setzen
export POSTGRES_PASSWORD=sicheres-passwort
export SESSION_SECRET=min-32-zeichen-geheimer-schluessel
export API_TOKEN=min-32-zeichen-api-token
export ALLOWED_ORIGINS=https://deine-domain.de
export PUBLIC_APP_URL=https://deine-domain.de
```

## Datenmodell

### Device (Gerät)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | CUID2 | Eindeutige ID |
| `callSign` | String(50) | Funkrufname (z.B. "Florian 4-23") |
| `serialNumber` | String(100)? | Seriennummer (optional) |
| `deviceType` | String(100) | Gerätetyp/Modell |
| `status` | Enum | AVAILABLE, ON_LOAN, DEFECT, MAINTENANCE |
| `notes` | String(500)? | Notizen (optional) |

### Loan (Ausleihe)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | CUID2 | Eindeutige ID |
| `deviceId` | CUID2 | Referenz auf Gerät |
| `borrowerName` | String(100) | Name des Ausleihenden |
| `borrowedAt` | DateTime | Ausleihzeitpunkt |
| `returnedAt` | DateTime? | Rückgabezeitpunkt |
| `returnNote` | String(500)? | Rückgabe-Notiz |

## Sicherheit

Das System implementiert mehrere Sicherheitsebenen:

- **API-Token**: Bearer-Token für alle API-Zugriffe
- **Session-Auth**: Admin-Bereich mit sicheren Cookies
- **Rate Limiting**: Schutz vor Brute-Force-Angriffen
- **Helmet**: Security-Header (CSP, HSTS, etc.)
- **Input-Validierung**: Zod-Schemas auf allen Endpunkten
- **Prepared Statements**: SQL-Injection-Schutz durch Prisma
- **Password Hashing**: bcrypt für Admin-Passwörter

## Entwicklung

### Architektur-Prinzipien

1. **Monorepo**: Shared Package für konsistente Typen
2. **Feature-Module**: Logische Trennung im Backend
3. **File-based Routing**: TanStack Router im Frontend
4. **Optimistic Updates**: Schnelle UI-Reaktionen
5. **Mobile-First**: Touch-Targets min. 44x44px

### Code-Qualität

```bash
# TypeScript-Prüfung
pnpm typecheck

# Tests mit Coverage
pnpm test -- --coverage

# Prisma-Schema validieren
pnpm --filter @radio-inventar/backend prisma validate
```

### Neue Migration erstellen

```bash
cd apps/backend
pnpm prisma migrate dev --name beschreibung-der-aenderung
```

## Troubleshooting

### PostgreSQL startet nicht

```bash
# Prüfen ob Port 5432 belegt ist
lsof -i :5432

# Container neu starten
pnpm db:down && pnpm db:up
```

### Backend-Fehler

```bash
# Dependencies prüfen
pnpm install

# Datenbank-Verbindung testen
pnpm db:up
curl http://localhost:3000/api/health
```

### Frontend zeigt Token-Fehler

1. Prüfe ob `API_TOKEN` im Backend gesetzt ist
2. Öffne `/token-setup` und gib das Token ein
3. Prüfe Browser-Console auf Netzwerkfehler

### Prisma-Migration schlägt fehl

```bash
# Datenbank zurücksetzen (ACHTUNG: Datenverlust!)
pnpm db:down
docker volume rm radio-inventar_postgres_data
pnpm db:up
pnpm db:migrate
```

## Mitwirken

Beiträge sind willkommen! Bitte beachte:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/mein-feature`)
3. Committe deine Änderungen (`git commit -m 'feat: Beschreibung'`)
4. Push zum Branch (`git push origin feature/mein-feature`)
5. Erstelle einen Pull Request

## Lizenz

[MIT](LICENSE)

## Dokumentation

Weitere Dokumentation findest du in [`docs/`](docs/):

- [Deployment-Anleitung](docs/deployment.md) - Production-Setup
- [API-Dokumentation](docs/api.md) - Detaillierte API-Referenz
- [Architektur](docs/architecture.md) - Technische Entscheidungen
- [PRD](docs/prd.md) - Produkt-Anforderungen
- [UX-Spezifikation](docs/ux-design-specification.md) - UI/UX-Design
