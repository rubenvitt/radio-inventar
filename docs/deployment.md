# Deployment-Anleitung

Diese Anleitung beschreibt verschiedene Deployment-Optionen für Radio Inventar, von einfachen Docker-Setups bis hin zu produktionsreifen Konfigurationen.

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Deployment-Optionen](#deployment-optionen)
  - [Option 1: Docker Compose (Empfohlen)](#option-1-docker-compose-empfohlen)
  - [Option 2: Kubernetes](#option-2-kubernetes)
  - [Option 3: Manuelles Deployment](#option-3-manuelles-deployment)
- [Frontend-Deployment](#frontend-deployment)
- [Reverse Proxy Konfiguration](#reverse-proxy-konfiguration)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Datenbank-Setup](#datenbank-setup)
- [SSL/TLS-Konfiguration](#ssltls-konfiguration)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Backup & Recovery](#backup--recovery)
- [Sicherheits-Checkliste](#sicherheits-checkliste)
- [Troubleshooting](#troubleshooting)

---

## Voraussetzungen

### Software-Anforderungen

| Software | Minimum | Empfohlen |
|----------|---------|-----------|
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 2.0+ | 2.24+ |
| Node.js (für manuell) | 20 LTS | 24 LTS |
| PostgreSQL | 15 | 16 |

### Hardware-Anforderungen

| Ressource | Minimum | Empfohlen |
|-----------|---------|-----------|
| CPU | 1 Core | 2+ Cores |
| RAM | 512 MB | 2 GB |
| Speicher | 1 GB | 10 GB |

### Netzwerk

- Port 3000 für Backend-API (oder alternativer Port)
- Port 5432 für PostgreSQL (nur intern)
- Port 80/443 für Reverse Proxy

---

## Deployment-Optionen

### Option 1: Docker Compose (Empfohlen)

Die einfachste Methode für Single-Server-Deployments.

#### 1.1 Vorbereitung

```bash
# Repository klonen
git clone https://github.com/rubenvitt/radio-inventar.git
cd radio-inventar

# Oder nur die benötigten Dateien herunterladen
curl -O https://raw.githubusercontent.com/rubenvitt/radio-inventar/main/docker-compose.yml
```

#### 1.2 Umgebungsvariablen konfigurieren

Erstelle eine `.env`-Datei im Projektverzeichnis:

```bash
# .env für Docker Compose

# Datenbank
POSTGRES_USER=radio
POSTGRES_PASSWORD=SICHERES_PASSWORT_HIER    # Mindestens 32 Zeichen!

# Backend
SESSION_SECRET=MINDESTENS_32_ZEICHEN_GEHEIM  # Zufällig generieren!
API_TOKEN=MINDESTENS_32_ZEICHEN_TOKEN        # Zufällig generieren!
ALLOWED_ORIGINS=https://radio.deine-domain.de
PUBLIC_APP_URL=https://radio.deine-domain.de

# Optional: Custom Image Tag
IMAGE_TAG=latest
```

**Sichere Secrets generieren:**

```bash
# Generiere sichere Zufallswerte
openssl rand -base64 48  # Für POSTGRES_PASSWORD
openssl rand -base64 48  # Für SESSION_SECRET
openssl rand -base64 48  # Für API_TOKEN
```

#### 1.3 Deployment starten

```bash
# Backend und PostgreSQL starten
docker-compose --profile full-app up -d

# Logs anzeigen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

#### 1.4 Health Check

```bash
curl http://localhost:3000/api/health
# Erwartet: {"status":"ok","timestamp":"...","database":"connected"}
```

#### 1.5 Aktualisierungen

```bash
# Neueste Images ziehen
docker-compose --profile full-app pull

# Container neu starten
docker-compose --profile full-app up -d

# Alte Images aufräumen
docker image prune -f
```

---

### Option 2: Kubernetes

Für skalierbare Produktionsumgebungen.

#### 2.1 Namespace erstellen

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: radio-inventar
```

#### 2.2 Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: radio-inventar-secrets
  namespace: radio-inventar
type: Opaque
stringData:
  POSTGRES_PASSWORD: "SICHERES_PASSWORT"
  SESSION_SECRET: "MINDESTENS_32_ZEICHEN"
  API_TOKEN: "MINDESTENS_32_ZEICHEN"
```

#### 2.3 PostgreSQL Deployment

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: radio-inventar
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: "radio"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: radio-inventar-secrets
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              value: "radio_inventar"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - radio
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: radio-inventar
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
```

#### 2.4 Backend Deployment

```yaml
# backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: radio-inventar
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/rubenvitt/radio-inventar/radio-inventar-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: DATABASE_URL
              value: "postgresql://radio:$(POSTGRES_PASSWORD)@postgres:5432/radio_inventar"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: radio-inventar-secrets
                  key: POSTGRES_PASSWORD
            - name: SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: radio-inventar-secrets
                  key: SESSION_SECRET
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: radio-inventar-secrets
                  key: API_TOKEN
            - name: ALLOWED_ORIGINS
              value: "https://radio.deine-domain.de"
            - name: PUBLIC_APP_URL
              value: "https://radio.deine-domain.de"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: radio-inventar
spec:
  ports:
    - port: 3000
  selector:
    app: backend
```

#### 2.5 Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: radio-inventar
  namespace: radio-inventar
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - radio.deine-domain.de
      secretName: radio-inventar-tls
  rules:
    - host: radio.deine-domain.de
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

#### 2.6 Deployment anwenden

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f backend.yaml
kubectl apply -f ingress.yaml
```

---

### Option 3: Manuelles Deployment

Für Umgebungen ohne Container-Support.

#### 3.1 Node.js und pnpm installieren

```bash
# Node.js 24 LTS (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# pnpm installieren
corepack enable
corepack prepare pnpm@9 --activate
```

#### 3.2 PostgreSQL installieren

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16

# Service starten
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Datenbank und Benutzer erstellen
sudo -u postgres psql << EOF
CREATE USER radio WITH PASSWORD 'SICHERES_PASSWORT';
CREATE DATABASE radio_inventar OWNER radio;
GRANT ALL PRIVILEGES ON DATABASE radio_inventar TO radio;
EOF
```

#### 3.3 Backend bauen und installieren

```bash
# Repository klonen
git clone https://github.com/rubenvitt/radio-inventar.git
cd radio-inventar

# Dependencies installieren
pnpm install --frozen-lockfile

# Shared Package bauen
pnpm --filter @radio-inventar/shared build

# Backend bauen
pnpm --filter @radio-inventar/backend build

# Prisma Client generieren
cd apps/backend
pnpm prisma generate

# Migrationen ausführen
pnpm prisma migrate deploy
```

#### 3.4 Backend konfigurieren

```bash
# apps/backend/.env erstellen
cat > apps/backend/.env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://radio:SICHERES_PASSWORT@localhost:5432/radio_inventar
SESSION_SECRET=MINDESTENS_32_ZEICHEN_GEHEIM
API_TOKEN=MINDESTENS_32_ZEICHEN_TOKEN
ALLOWED_ORIGINS=https://radio.deine-domain.de
PUBLIC_APP_URL=https://radio.deine-domain.de
EOF
```

#### 3.5 Systemd Service einrichten

```bash
# /etc/systemd/system/radio-inventar.service
sudo tee /etc/systemd/system/radio-inventar.service << EOF
[Unit]
Description=Radio Inventar Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/radio-inventar/apps/backend
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable radio-inventar
sudo systemctl start radio-inventar

# Status prüfen
sudo systemctl status radio-inventar
```

---

## Frontend-Deployment

Das Frontend ist eine statische Single-Page-Application (SPA).

### Frontend bauen

```bash
cd radio-inventar

# Environment konfigurieren
echo "VITE_API_URL=https://radio.deine-domain.de/api" > apps/frontend/.env

# Frontend bauen
pnpm --filter @radio-inventar/frontend build

# Build-Output: apps/frontend/dist/
```

### Deployment-Optionen

#### Nginx (Empfohlen)

```nginx
server {
    listen 80;
    server_name radio.deine-domain.de;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name radio.deine-domain.de;

    ssl_certificate /etc/letsencrypt/live/radio.deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radio.deine-domain.de/privkey.pem;

    # Frontend (statische Dateien)
    root /var/www/radio-inventar;
    index index.html;

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache für statische Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Caddy

```caddyfile
radio.deine-domain.de {
    # Frontend
    root * /var/www/radio-inventar
    file_server
    try_files {path} /index.html

    # API Proxy
    handle /api/* {
        reverse_proxy localhost:3000
    }

    # Kompression
    encode gzip
}
```

#### Vercel / Netlify

Erstelle `vercel.json` oder `netlify.toml`:

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.deine-domain.de/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

```toml
# netlify.toml
[[redirects]]
  from = "/api/*"
  to = "https://api.deine-domain.de/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Reverse Proxy Konfiguration

### Nginx mit SSL

```nginx
upstream backend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name radio.deine-domain.de;

    # SSL-Konfiguration
    ssl_certificate /etc/letsencrypt/live/radio.deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radio.deine-domain.de/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Frontend
    root /var/www/radio-inventar;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Traefik (Docker)

```yaml
# docker-compose.override.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@deine-domain.de"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`radio.deine-domain.de`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
```

### Cloudflare

Wenn du Cloudflare als Reverse Proxy verwendest:

1. SSL-Modus auf "Full (strict)" setzen
2. "Always Use HTTPS" aktivieren
3. Backend konfigurieren für Trust Proxy:

```bash
# Die Anwendung unterstützt bereits trust proxy
# Stelle sicher, dass ALLOWED_ORIGINS die Cloudflare-Domain enthält
```

---

## Umgebungsvariablen

### Backend (Vollständige Referenz)

| Variable | Pflicht | Beschreibung | Beispiel |
|----------|---------|--------------|----------|
| `NODE_ENV` | Ja | Umgebung | `production` |
| `PORT` | Nein | Server-Port (Default: 3000) | `3000` |
| `DATABASE_URL` | Ja | PostgreSQL Connection String | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Ja | Session-Verschlüsselung (min. 32 Zeichen) | `openssl rand -base64 48` |
| `API_TOKEN` | Ja | API-Authentifizierung (min. 32 Zeichen) | `openssl rand -base64 48` |
| `ALLOWED_ORIGINS` | Ja | CORS Origins (kommasepariert) | `https://app.example.com` |
| `PUBLIC_APP_URL` | Ja | Öffentliche URL für QR-Codes | `https://app.example.com` |

### Frontend

| Variable | Pflicht | Beschreibung | Beispiel |
|----------|---------|--------------|----------|
| `VITE_API_URL` | Ja | Backend API URL | `https://api.example.com/api` |

### Docker Compose

| Variable | Pflicht | Beschreibung | Default |
|----------|---------|--------------|---------|
| `POSTGRES_USER` | Nein | DB-Benutzer | `radio` |
| `POSTGRES_PASSWORD` | Ja | DB-Passwort | - |
| `IMAGE_TAG` | Nein | Backend-Image-Version | `latest` |

---

## Datenbank-Setup

### PostgreSQL Optimierung

```sql
-- postgresql.conf Empfehlungen für Production
-- (Anpassen je nach verfügbarem RAM)

shared_buffers = 256MB           -- 25% des RAMs
effective_cache_size = 768MB     -- 75% des RAMs
work_mem = 64MB
maintenance_work_mem = 128MB
random_page_cost = 1.1           -- Für SSDs
effective_io_concurrency = 200   -- Für SSDs

-- Connection Limits
max_connections = 100

-- WAL-Einstellungen
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Initiale Migrationen

```bash
# Bei Docker Compose werden Migrationen automatisch ausgeführt
# Bei manuellem Setup:
cd apps/backend
pnpm prisma migrate deploy
```

### Session-Tabelle

Die Session-Tabelle wird automatisch von `connect-pg-simple` erstellt:

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

---

## SSL/TLS-Konfiguration

### Let's Encrypt mit Certbot

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# Zertifikat erstellen
sudo certbot --nginx -d radio.deine-domain.de

# Auto-Renewal prüfen
sudo certbot renew --dry-run
```

### Self-Signed (nur für Tests)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/radio-inventar.key \
  -out /etc/ssl/certs/radio-inventar.crt \
  -subj "/CN=radio.local"
```

---

## Monitoring & Health Checks

### Health-Check Endpoint

```bash
# Basis Health-Check
curl https://radio.deine-domain.de/api/health

# Erwartete Antwort:
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": "connected"
}
```

### Prometheus Metrics (optional)

Falls gewünscht, können Prometheus-Metrics über NestJS-Module hinzugefügt werden.

### Uptime-Monitoring

Empfohlene Services:
- **UptimeRobot** (kostenlos)
- **Healthchecks.io**
- **Uptime Kuma** (Self-hosted)

Konfiguration:
- URL: `https://radio.deine-domain.de/api/health`
- Intervall: 5 Minuten
- Erwarteter Status: 200

### Log-Aggregation

```bash
# Docker Logs
docker-compose logs -f backend

# Systemd Logs
journalctl -u radio-inventar -f

# Logs nach Datei umleiten
docker-compose logs backend > /var/log/radio-inventar/backend.log 2>&1
```

---

## Backup & Recovery

### Datenbank-Backup

#### Automatisches Backup-Script

```bash
#!/bin/bash
# /opt/scripts/backup-radio-inventar.sh

BACKUP_DIR="/var/backups/radio-inventar"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/radio_inventar_$DATE.sql.gz"

# Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

# Backup erstellen
docker exec radio-inventar-db pg_dump -U radio radio_inventar | gzip > "$BACKUP_FILE"

# Alte Backups löschen (älter als 30 Tage)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# Auf Remote-Storage kopieren (optional)
# aws s3 cp "$BACKUP_FILE" s3://dein-bucket/backups/
```

#### Cronjob einrichten

```bash
# Täglich um 2 Uhr
0 2 * * * /opt/scripts/backup-radio-inventar.sh >> /var/log/backup-radio-inventar.log 2>&1
```

### Recovery

```bash
# Aus Backup wiederherstellen
gunzip -c /var/backups/radio-inventar/radio_inventar_20250101_020000.sql.gz | \
  docker exec -i radio-inventar-db psql -U radio radio_inventar

# Bei komplettem Datenverlust:
# 1. Neuen Container starten
docker-compose up -d postgres

# 2. Warten bis gesund
docker-compose exec postgres pg_isready -U radio

# 3. Backup einspielen
gunzip -c backup.sql.gz | docker exec -i radio-inventar-db psql -U radio radio_inventar

# 4. Backend starten
docker-compose --profile full-app up -d backend
```

---

## Sicherheits-Checkliste

### Vor dem Deployment

- [ ] Sichere Passwörter generiert (min. 32 Zeichen)
- [ ] `SESSION_SECRET` ist einzigartig und sicher
- [ ] `API_TOKEN` ist einzigartig und sicher
- [ ] `POSTGRES_PASSWORD` ist sicher
- [ ] `NODE_ENV=production` gesetzt
- [ ] HTTPS konfiguriert und erzwungen
- [ ] `ALLOWED_ORIGINS` korrekt konfiguriert
- [ ] `PUBLIC_APP_URL` verwendet HTTPS

### Nach dem Deployment

- [ ] Health-Check funktioniert
- [ ] Admin-Login funktioniert
- [ ] Rate Limiting aktiv (Login-Versuche testen)
- [ ] CORS blockiert unerlaubte Origins
- [ ] Cookies sind `HttpOnly` und `Secure`
- [ ] Security-Header aktiv (Helmet)

### Regelmäßige Wartung

- [ ] Backups funktionieren und werden getestet
- [ ] Docker-Images regelmäßig aktualisiert
- [ ] SSL-Zertifikate vor Ablauf erneuert
- [ ] Logs auf Anomalien geprüft
- [ ] Dependency-Updates eingespielt

---

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker-compose logs backend

# Häufige Ursachen:
# 1. Datenbank nicht erreichbar
docker-compose exec backend ping postgres

# 2. Environment-Variablen fehlen
docker-compose config

# 3. Port bereits belegt
lsof -i :3000
```

### Datenbank-Verbindungsfehler

```bash
# PostgreSQL-Status prüfen
docker-compose exec postgres pg_isready -U radio

# Verbindung testen
docker-compose exec postgres psql -U radio -d radio_inventar -c "SELECT 1"

# Logs prüfen
docker-compose logs postgres
```

### 502 Bad Gateway

1. Backend läuft nicht:
   ```bash
   docker-compose ps backend
   docker-compose logs backend
   ```

2. Nginx-Proxy-Konfiguration prüfen:
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

### Session-Probleme

1. Cookie wird nicht gesetzt:
   - Prüfe `ALLOWED_ORIGINS`
   - Prüfe ob HTTPS verwendet wird
   - Prüfe Browser-DevTools → Application → Cookies

2. Session läuft sofort ab:
   - Prüfe `SESSION_SECRET` (muss konstant bleiben)
   - Prüfe PostgreSQL-Session-Tabelle

### CORS-Fehler

```bash
# Origins prüfen
echo $ALLOWED_ORIGINS

# Richtig konfiguriert?
# Falsch: ALLOWED_ORIGINS=https://example.com,
# Richtig: ALLOWED_ORIGINS=https://example.com
```

### Performance-Probleme

```bash
# Container-Ressourcen prüfen
docker stats

# PostgreSQL Slow Queries
docker-compose exec postgres psql -U radio -d radio_inventar << EOF
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF
```

---

## Weiterführende Dokumentation

- [README.md](../README.md) - Projektübersicht
- [API-Dokumentation](api.md) - Detaillierte API-Referenz
- [Architektur](architecture.md) - Technische Entscheidungen
- [Security Checklist](string-transformation-security-checklist.md) - Sicherheitsrichtlinien
