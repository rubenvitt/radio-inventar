# API-Dokumentation

Vollständige Referenz der Radio Inventar REST API.

## Inhaltsverzeichnis

- [Allgemeines](#allgemeines)
  - [Base URL](#base-url)
  - [Authentifizierung](#authentifizierung)
  - [Fehlerbehandlung](#fehlerbehandlung)
  - [Rate Limiting](#rate-limiting)
- [Öffentliche Endpunkte](#öffentliche-endpunkte)
  - [Health Check](#health-check)
  - [Geräte](#geräte)
  - [Ausleihen](#ausleihen)
  - [Entleiher-Vorschläge](#entleiher-vorschläge)
  - [Setup](#setup)
- [Admin-Endpunkte](#admin-endpunkte)
  - [Authentifizierung](#admin-authentifizierung)
  - [Geräteverwaltung](#geräteverwaltung)
  - [Historie](#historie)
- [Datentypen](#datentypen)
- [Beispiele](#beispiele)

---

## Allgemeines

### Base URL

```
Production: https://radio.deine-domain.de/api
Development: http://localhost:3000/api
```

### Authentifizierung

Die API verwendet zwei Authentifizierungsmethoden:

#### 1. API-Token (für alle Endpunkte)

Alle API-Anfragen (außer `/health`) erfordern einen Bearer-Token im Authorization-Header:

```http
Authorization: Bearer <API_TOKEN>
```

**Beispiel:**

```bash
curl -H "Authorization: Bearer dein-api-token-hier" \
  https://radio.deine-domain.de/api/devices
```

#### 2. Session-Cookie (für Admin-Endpunkte)

Admin-Endpunkte erfordern zusätzlich eine gültige Session. Die Session wird durch erfolgreichen Login erstellt:

```bash
# Login erstellt Session-Cookie
curl -c cookies.txt -X POST \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"geheim"}' \
  https://radio.deine-domain.de/api/admin/auth/login

# Folgende Anfragen mit Cookie
curl -b cookies.txt -H "Authorization: Bearer <API_TOKEN>" \
  https://radio.deine-domain.de/api/admin/devices
```

### Fehlerbehandlung

Fehler werden als JSON mit HTTP-Statuscode zurückgegeben:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**Häufige Statuscodes:**

| Code | Bedeutung |
|------|-----------|
| `200` | Erfolgreich |
| `201` | Erstellt |
| `400` | Ungültige Anfrage (Validierungsfehler) |
| `401` | Nicht authentifiziert |
| `403` | Zugriff verweigert |
| `404` | Nicht gefunden |
| `429` | Rate Limit überschritten |
| `500` | Serverfehler |

### Rate Limiting

Die API begrenzt Anfragen pro Zeitfenster:

| Endpunkt | Limit | Zeitfenster |
|----------|-------|-------------|
| `/api/admin/auth/login` | 5 Anfragen | 15 Minuten |
| `/api/setup` | 3 Anfragen | 15 Sekunden |
| `/api/loans` (POST/PATCH) | 10 Anfragen | 60 Sekunden |
| `/api/devices/print-template` | 30 Anfragen | 60 Sekunden |
| `/api/borrowers/suggestions` | 30 Anfragen | 60 Sekunden |
| Andere | 30 Anfragen | 60 Sekunden |

Bei Überschreitung:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

---

## Öffentliche Endpunkte

### Health Check

Überprüft den Status der Anwendung und Datenbankverbindung.

```http
GET /api/health
```

**Authentifizierung:** Keine (API-Token nicht erforderlich)

**Antwort:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": "connected"
}
```

---

### Geräte

#### Geräteliste abrufen

```http
GET /api/devices
```

**Query-Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `status` | string | Nein | Filter nach Status: `AVAILABLE`, `ON_LOAN`, `DEFECT`, `MAINTENANCE` |
| `take` | number | Nein | Anzahl Ergebnisse (max. 50, default: 50) |
| `skip` | number | Nein | Übersprungene Ergebnisse (Pagination) |

**Antwort:**

```json
[
  {
    "id": "clx1234567890abcdef",
    "callSign": "Florian 4-23",
    "serialNumber": "SN-2024-001",
    "deviceType": "Motorola DP4800e",
    "status": "AVAILABLE",
    "notes": "Batterie neu 12/2024",
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
]
```

**Beispiel:**

```bash
# Alle verfügbaren Geräte
curl -H "Authorization: Bearer <TOKEN>" \
  "https://api.example.com/api/devices?status=AVAILABLE"

# Mit Pagination
curl -H "Authorization: Bearer <TOKEN>" \
  "https://api.example.com/api/devices?take=10&skip=20"
```

---

#### Druckvorlage als PDF

Generiert eine PDF-Datei mit allen Geräten und QR-Codes.

```http
GET /api/devices/print-template
```

**Antwort:**

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="geraete-liste.pdf"
```

**Beispiel:**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  -o geraete-liste.pdf \
  https://api.example.com/api/devices/print-template
```

---

### Ausleihen

#### Aktive Ausleihen abrufen

```http
GET /api/loans/active
```

**Query-Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `take` | number | Nein | Anzahl Ergebnisse (max. 50) |
| `skip` | number | Nein | Übersprungene Ergebnisse |

**Antwort:**

```json
[
  {
    "id": "clx9876543210fedcba",
    "deviceId": "clx1234567890abcdef",
    "borrowerName": "Max Mustermann",
    "borrowedAt": "2025-01-01T08:00:00.000Z",
    "returnedAt": null,
    "returnNote": null,
    "device": {
      "id": "clx1234567890abcdef",
      "callSign": "Florian 4-23",
      "deviceType": "Motorola DP4800e"
    }
  }
]
```

---

#### Neue Ausleihe erstellen

```http
POST /api/loans
```

**Request Body:**

```json
{
  "deviceId": "clx1234567890abcdef",
  "borrowerName": "Max Mustermann"
}
```

**Validierung:**

| Feld | Regeln |
|------|--------|
| `deviceId` | Pflicht, gültiges CUID2-Format |
| `borrowerName` | Pflicht, 1-100 Zeichen |

**Antwort (201 Created):**

```json
{
  "id": "clx9876543210fedcba",
  "deviceId": "clx1234567890abcdef",
  "borrowerName": "Max Mustermann",
  "borrowedAt": "2025-01-01T08:00:00.000Z",
  "returnedAt": null,
  "returnNote": null
}
```

**Fehler:**

```json
// Gerät nicht verfügbar (400)
{
  "statusCode": 400,
  "message": "Gerät ist nicht verfügbar",
  "error": "Bad Request"
}

// Gerät nicht gefunden (404)
{
  "statusCode": 404,
  "message": "Gerät nicht gefunden",
  "error": "Not Found"
}
```

**Beispiel:**

```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"clx1234567890abcdef","borrowerName":"Max Mustermann"}' \
  https://api.example.com/api/loans
```

---

#### Gerät zurückgeben

```http
PATCH /api/loans/:loanId
```

**URL-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `loanId` | string | CUID2 der Ausleihe |

**Request Body:**

```json
{
  "returnNote": "Keine Probleme"
}
```

**Validierung:**

| Feld | Regeln |
|------|--------|
| `returnNote` | Optional, max. 500 Zeichen |

**Antwort:**

```json
{
  "id": "clx9876543210fedcba",
  "deviceId": "clx1234567890abcdef",
  "borrowerName": "Max Mustermann",
  "borrowedAt": "2025-01-01T08:00:00.000Z",
  "returnedAt": "2025-01-01T16:00:00.000Z",
  "returnNote": "Keine Probleme"
}
```

**Beispiel:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"returnNote":"Batterie war leer"}' \
  https://api.example.com/api/loans/clx9876543210fedcba
```

---

### Entleiher-Vorschläge

Autocomplete für Entleiher-Namen basierend auf bisherigen Ausleihen.

```http
GET /api/borrowers/suggestions
```

**Query-Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `q` | string | Ja | Suchbegriff (min. 2 Zeichen) |
| `limit` | number | Nein | Max. Ergebnisse (default: 10, max: 50) |

**Antwort:**

```json
[
  { "name": "Max Mustermann" },
  { "name": "Maria Musterfrau" }
]
```

**Beispiel:**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://api.example.com/api/borrowers/suggestions?q=Mus&limit=5"
```

---

### Setup

#### Setup-Status prüfen

Prüft, ob bereits ein Admin-Benutzer existiert.

```http
GET /api/setup/status
```

**Antwort:**

```json
{
  "isSetupComplete": false
}
```

---

#### Ersten Admin erstellen

Erstellt den ersten Administrator-Account. Nur verfügbar, wenn noch kein Admin existiert.

```http
POST /api/setup
```

**Request Body:**

```json
{
  "username": "admin",
  "password": "sicheres-passwort"
}
```

**Validierung:**

| Feld | Regeln |
|------|--------|
| `username` | Pflicht, 3-50 Zeichen, alphanumerisch |
| `password` | Pflicht, min. 8 Zeichen |

**Antwort (201 Created):**

```json
{
  "username": "admin",
  "isValid": true
}
```

**Fehler:**

```json
// Setup bereits abgeschlossen (403)
{
  "statusCode": 403,
  "message": "Setup wurde bereits abgeschlossen",
  "error": "Forbidden"
}
```

---

## Admin-Endpunkte

Alle Admin-Endpunkte erfordern:
1. Gültigen API-Token
2. Aktive Admin-Session (Cookie)

### Admin-Authentifizierung

#### Login

```http
POST /api/admin/auth/login
```

**Request Body:**

```json
{
  "username": "admin",
  "password": "sicheres-passwort"
}
```

**Antwort:**

```json
{
  "username": "admin",
  "isValid": true
}
```

**Set-Cookie Header:**

```http
Set-Cookie: radio-inventar.sid=...; Path=/; HttpOnly; Secure; SameSite=Lax
```

---

#### Logout

```http
POST /api/admin/auth/logout
```

**Antwort:**

```json
{
  "message": "Erfolgreich abgemeldet"
}
```

---

#### Session prüfen

```http
GET /api/admin/auth/session
```

**Antwort:**

```json
{
  "username": "admin",
  "isValid": true
}
```

---

### Geräteverwaltung

#### Gerät erstellen

```http
POST /api/admin/devices
```

**Request Body:**

```json
{
  "callSign": "Florian 4-24",
  "deviceType": "Motorola DP4800e",
  "serialNumber": "SN-2024-002",
  "notes": "Neues Gerät"
}
```

**Validierung:**

| Feld | Regeln |
|------|--------|
| `callSign` | Pflicht, 1-50 Zeichen |
| `deviceType` | Pflicht, 1-100 Zeichen |
| `serialNumber` | Optional, max. 100 Zeichen |
| `notes` | Optional, max. 500 Zeichen |

**Antwort (201 Created):**

```json
{
  "id": "clxnewdevice123456",
  "callSign": "Florian 4-24",
  "deviceType": "Motorola DP4800e",
  "serialNumber": "SN-2024-002",
  "status": "AVAILABLE",
  "notes": "Neues Gerät",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```

---

#### Geräteliste (Admin)

```http
GET /api/admin/devices
```

Identisch zu `GET /api/devices`, aber nur für Admins zugänglich.

---

#### Gerät bearbeiten

```http
PATCH /api/admin/devices/:deviceId
```

**URL-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `deviceId` | string | CUID2 des Geräts |

**Request Body (alle Felder optional):**

```json
{
  "callSign": "Florian 4-24 (neu)",
  "deviceType": "Motorola DP4801e",
  "serialNumber": "SN-2024-002-A",
  "notes": "Aktualisierte Notizen"
}
```

**Antwort:**

```json
{
  "id": "clxnewdevice123456",
  "callSign": "Florian 4-24 (neu)",
  "deviceType": "Motorola DP4801e",
  "serialNumber": "SN-2024-002-A",
  "status": "AVAILABLE",
  "notes": "Aktualisierte Notizen",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T14:00:00.000Z"
}
```

---

#### Gerätestatus ändern

```http
PATCH /api/admin/devices/:deviceId/status
```

**Request Body:**

```json
{
  "status": "MAINTENANCE"
}
```

**Erlaubte Status:**

| Status | Beschreibung |
|--------|--------------|
| `AVAILABLE` | Verfügbar für Ausleihe |
| `DEFECT` | Defekt |
| `MAINTENANCE` | In Wartung |

> **Hinweis:** `ON_LOAN` kann nicht manuell gesetzt werden. Dieser Status wird automatisch durch das Ausleihe-System verwaltet.

**Antwort:**

```json
{
  "id": "clxnewdevice123456",
  "status": "MAINTENANCE",
  "updatedAt": "2025-01-01T15:00:00.000Z"
}
```

---

#### Gerät löschen

```http
DELETE /api/admin/devices/:deviceId
```

**Antwort (204 No Content):**

Kein Body.

**Fehler:**

```json
// Gerät hat aktive Ausleihe (400)
{
  "statusCode": 400,
  "message": "Gerät kann nicht gelöscht werden: Aktive Ausleihe vorhanden",
  "error": "Bad Request"
}
```

---

### Historie

#### Ausleihe-Historie abrufen

```http
GET /api/admin/history
```

**Query-Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `deviceId` | string | Nein | Filter nach Gerät |
| `borrowerName` | string | Nein | Filter nach Entleiher |
| `from` | ISO-Date | Nein | Von Datum |
| `to` | ISO-Date | Nein | Bis Datum |
| `take` | number | Nein | Anzahl Ergebnisse (max. 100) |
| `skip` | number | Nein | Pagination-Offset |

**Antwort:**

```json
{
  "data": [
    {
      "id": "clx9876543210fedcba",
      "deviceId": "clx1234567890abcdef",
      "borrowerName": "Max Mustermann",
      "borrowedAt": "2025-01-01T08:00:00.000Z",
      "returnedAt": "2025-01-01T16:00:00.000Z",
      "returnNote": "Batterie war leer",
      "device": {
        "callSign": "Florian 4-23",
        "deviceType": "Motorola DP4800e"
      }
    }
  ],
  "total": 156,
  "take": 50,
  "skip": 0
}
```

**Beispiel:**

```bash
# Ausleihen der letzten Woche
curl -b cookies.txt \
  -H "Authorization: Bearer <TOKEN>" \
  "https://api.example.com/api/admin/history?from=2025-01-01&to=2025-01-07"
```

---

#### CSV-Export

```http
GET /api/admin/history/export/csv
```

**Query-Parameter:** Identisch zu Historie-Endpunkt.

**Antwort:**

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="ausleihe-historie.csv"
```

**CSV-Format:**

```csv
"Ausleihe-ID","Gerät-ID","Rufzeichen","Gerätetyp","Entleiher","Ausgeliehen am","Zurückgegeben am","Rückgabe-Notiz"
"clx987...","clx123...","Florian 4-23","Motorola DP4800e","Max Mustermann","2025-01-01T08:00:00.000Z","2025-01-01T16:00:00.000Z","Batterie war leer"
```

---

## Datentypen

### DeviceStatus (Enum)

```typescript
type DeviceStatus =
  | "AVAILABLE"    // Verfügbar
  | "ON_LOAN"      // Ausgeliehen
  | "DEFECT"       // Defekt
  | "MAINTENANCE"; // In Wartung
```

### Device

```typescript
interface Device {
  id: string;           // CUID2
  callSign: string;     // 1-50 Zeichen
  serialNumber?: string; // max. 100 Zeichen
  deviceType: string;   // 1-100 Zeichen
  status: DeviceStatus;
  notes?: string;       // max. 500 Zeichen
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

### Loan

```typescript
interface Loan {
  id: string;           // CUID2
  deviceId: string;     // CUID2
  borrowerName: string; // 1-100 Zeichen
  borrowedAt: string;   // ISO 8601
  returnedAt?: string;  // ISO 8601, null wenn aktiv
  returnNote?: string;  // max. 500 Zeichen
}
```

### LoanWithDevice

```typescript
interface LoanWithDevice extends Loan {
  device: {
    id: string;
    callSign: string;
    deviceType: string;
  };
}
```

### CUID2

Compact Unique Identifier Version 2. Format: `^[a-z][a-z0-9]{24}$`

Beispiel: `clx1234567890abcdefghij`

---

## Beispiele

### Vollständiger Ausleihe-Workflow

```bash
# 1. Verfügbare Geräte abrufen
AVAILABLE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/devices?status=AVAILABLE")

# 2. Erstes Gerät ausleihen
DEVICE_ID=$(echo $AVAILABLE | jq -r '.[0].id')
LOAN=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"borrowerName\":\"Max Mustermann\"}" \
  https://api.example.com/api/loans)

LOAN_ID=$(echo $LOAN | jq -r '.id')
echo "Ausleihe erstellt: $LOAN_ID"

# 3. Aktive Ausleihen prüfen
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/loans/active | jq

# 4. Gerät zurückgeben
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"returnNote":"Alles in Ordnung"}' \
  "https://api.example.com/api/loans/$LOAN_ID" | jq
```

### Admin-Session mit cURL

```bash
# Token und Credentials
TOKEN="dein-api-token"
USERNAME="admin"
PASSWORD="geheim"

# 1. Login (Session-Cookie speichern)
curl -c cookies.txt -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  https://api.example.com/api/admin/auth/login

# 2. Admin-Aktion mit Cookie
curl -b cookies.txt \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/admin/devices

# 3. Neues Gerät erstellen
curl -b cookies.txt -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "callSign": "Florian 4-99",
    "deviceType": "Motorola DP4800e",
    "serialNumber": "TEST-001"
  }' \
  https://api.example.com/api/admin/devices

# 4. Logout
curl -b cookies.txt -c cookies.txt -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/admin/auth/logout
```

### JavaScript/TypeScript Client

```typescript
const API_URL = 'https://api.example.com/api';
const API_TOKEN = 'dein-api-token';

// Basis-Fetch-Funktion
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Für Session-Cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Geräte abrufen
const devices = await apiFetch<Device[]>('/devices?status=AVAILABLE');

// Ausleihe erstellen
const loan = await apiFetch<Loan>('/loans', {
  method: 'POST',
  body: JSON.stringify({
    deviceId: devices[0].id,
    borrowerName: 'Max Mustermann',
  }),
});

// Rückgabe
await apiFetch<Loan>(`/loans/${loan.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    returnNote: 'Alles okay',
  }),
});
```

---

## Weiterführende Links

- [README.md](../README.md) - Projektübersicht
- [Deployment](deployment.md) - Deployment-Anleitung
- [Architektur](architecture.md) - Technische Details
- [Zod-Schemas](../packages/shared/src/schemas/) - Validierungsschemas
