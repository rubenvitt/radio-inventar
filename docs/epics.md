---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - 'docs/prd.md'
  - 'docs/architecture.md'
  - 'docs/ux-design-specification.md'
status: complete
completedAt: '2025-12-14'
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-14'
---

# radio-inventar - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for radio-inventar, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Geräteausleihe (FR1-FR5):**
- FR1: Helfer können ein verfügbares Funkgerät aus einer Liste auswählen
- FR2: Helfer können ihren Namen bei der Ausleihe eingeben
- FR3: System schlägt Namen basierend auf bisherigen Eingaben vor (Autocomplete)
- FR4: Helfer können eine Ausleihe mit einem Klick bestätigen
- FR5: System erfasst Ausleihe-Zeitstempel automatisch

**Geräterückgabe (FR6-FR9):**
- FR6: Helfer können ihr ausgeliehenes Gerät in einer persönlichen Liste sehen
- FR7: Helfer können bei der Rückgabe optional eine Zustandsnotiz eingeben
- FR8: Helfer können eine Rückgabe mit einem Klick bestätigen
- FR9: System erfasst Rückgabe-Zeitstempel automatisch

**Live-Übersicht (FR10-FR13):**
- FR10: Alle Nutzer können eine Liste aller aktuell ausgeliehenen Geräte einsehen
- FR11: Die Übersicht zeigt pro Gerät: Rufname, Ausleiher, Ausleihe-Zeitpunkt
- FR12: Nutzer können die Übersicht manuell aktualisieren (Refresh)
- FR13: Geräte werden farblich nach Status codiert (verfügbar/ausgeliehen/defekt)

**Geräteverwaltung Admin (FR14-FR19):**
- FR14: Admins können sich mit Zugangsdaten anmelden
- FR15: Admins können neue Geräte anlegen
- FR16: Admins können Gerätedaten bearbeiten (Rufname, Seriennummer, Gerätetyp, Notizen)
- FR17: Admins können den Gerätestatus ändern (verfügbar, defekt, Wartung)
- FR18: Admins können Geräte löschen
- FR19: System verhindert Löschen von aktuell ausgeliehenen Geräten

**Historie & Reporting Admin (FR20-FR23):**
- FR20: Admins können die Ausleihe-Historie aller Geräte einsehen
- FR21: Historie zeigt: Gerät, Ausleiher, Ausleihe-Zeit, Rückgabe-Zeit, Zustandsnotiz
- FR22: Admins können die Historie als CSV exportieren
- FR23: Admins können die Historie nach Gerät oder Zeitraum filtern

**Dashboard Admin (FR24-FR25):**
- FR24: Admins sehen eine Zusammenfassung: Anzahl verfügbar / ausgeliehen / defekt
- FR25: Dashboard zeigt aktuell ausgeliehene Geräte mit Ausleihern

**Benutzeroberfläche (FR26-FR28):**
- FR26: Alle Nutzer können zwischen hellem und dunklem Modus wählen
- FR27: Interface ist touch-optimiert mit großen Bedienelementen
- FR28: Interface funktioniert auf Tablets (primär) und Desktop (sekundär)

### NonFunctional Requirements

**Performance (NFR1-NFR4):**
- NFR1: Seitenladezeit < 3 Sekunden (Initial Load auf Tablet)
- NFR2: Interaktions-Feedback < 500ms (Zeit bis visuelles Feedback)
- NFR3: API-Antwortzeit < 1 Sekunde (Server-Response für CRUD-Operationen)
- NFR4: Ausleihe-Gesamtzeit < 30 Sekunden (Von App-Öffnen bis Bestätigung)

**Reliability (NFR5-NFR7):**
- NFR5: Verfügbarkeit während Übungen und Einsätzen
- NFR6: Keine Datenverluste bei Ausleihe-/Rückgabevorgängen
- NFR7: Benutzerfreundliche Fehlermeldungen bei Netzwerkproblemen

**Security (NFR8-NFR10):**
- NFR8: Sichere Anmeldung für Admin-Bereich (Passwort-geschützt)
- NFR9: Admin-Sessions laufen nach Inaktivität ab
- NFR10: Keine sensiblen Daten (nur Namen als Freitext, keine personenbezogenen IDs)

**Usability (NFR11-NFR13):**
- NFR11: Buttons mindestens 44x44px für Handschuh-Nutzung
- NFR12: Ausreichender Kontrast für Nutzung bei verschiedenen Lichtverhältnissen (WCAG AA)
- NFR13: Neue Nutzer können ohne Einweisung ausleihen/zurückgeben

### Additional Requirements

**Aus Architecture - Projekt-Setup:**
- Manuelles Setup mit pnpm workspaces (kein Starter-Template)
- Monorepo-Struktur: `apps/frontend`, `apps/backend`, `packages/shared`
- Docker Compose für PostgreSQL + Backend Entwicklung
- Environment Variables: DATABASE_URL, SESSION_SECRET, VITE_API_URL

**Aus Architecture - Tech-Stack:**
- Frontend: Vite 6.x, React 19.x, TanStack Router 1.141.x, TanStack Query 5.90.x, TanStack Form 1.27.x, TanStack Store 0.8.x
- Backend: NestJS 11.x, Prisma 7.x, PostgreSQL 16
- Styling: Tailwind CSS v4 + shadcn/ui
- Validierung: Zod v4 (shared Schemas zwischen Frontend/Backend)

**Aus Architecture - API-Design:**
- REST-API mit definierten Endpoints (siehe Architecture.md)
- Session-basierte Admin-Auth (express-session, HttpOnly Cookie)
- Konsistente Error Response Formate mit statusCode, message, errors[]
- Controller → Service → Repository Pattern im Backend

**Aus Architecture - Implementation Patterns:**
- Naming Conventions: PascalCase für Models/Enums, camelCase für Felder/Variablen, kebab-case für URLs
- Query Key Factory Pattern für TanStack Query
- Optimistic Updates für Ausleihe/Rückgabe
- Co-located Tests neben Source-Files
- Zod-Schemas aus `@radio-inventar/shared` importieren

**Aus UX Design - Visual Design:**
- Dark Mode als Default (FüKw-Nutzung nachts)
- Status-Farbcodierung: Grün (#22c55e/#16a34a), Orange (#f59e0b/#d97706), Rot (#ef4444/#dc2626)
- System-Font-Stack (keine externen Fonts)
- WCAG AA Konformität (Kontrast 4.5:1+)

**Aus UX Design - Touch-Optimierung:**
- Touch-Targets: Min. 44px, optimal 64px, handschuh-optimiert 88px
- Bottom Tab Navigation mit 4 Tabs: Ausleihen, Zurückgeben, Übersicht, Admin
- Skeleton Screens für Loading States
- Optimistic UI Updates für gefühlte Performance < 100ms

**Aus UX Design - Performance:**
- Performance Budget: < 400KB First Load (JS < 200KB, CSS < 50KB)
- Autocomplete nach 2 Zeichen
- Tablet-first Design (768px+ primär)

### FR Coverage Map

| FR | Epic | Beschreibung |
|----|------|--------------|
| FR1 | Epic 3 | Gerät aus Liste wählen |
| FR2 | Epic 3 | Name eingeben |
| FR3 | Epic 3 | Autocomplete für Namen |
| FR4 | Epic 3 | Ein-Klick-Bestätigung |
| FR5 | Epic 3 | Automatischer Ausleihe-Zeitstempel |
| FR6 | Epic 4 | Eigene Geräte sehen |
| FR7 | Epic 4 | Zustandsnotiz optional |
| FR8 | Epic 4 | Ein-Klick-Rückgabe |
| FR9 | Epic 4 | Automatischer Rückgabe-Zeitstempel |
| FR10 | Epic 2 | Liste ausgeliehener Geräte |
| FR11 | Epic 2 | Details: Rufname, Ausleiher, Zeit |
| FR12 | Epic 2 | Manuelles Refresh |
| FR13 | Epic 2 | Farbcodierung nach Status |
| FR14 | Epic 5 | Admin-Login |
| FR15 | Epic 5 | Gerät anlegen |
| FR16 | Epic 5 | Gerät bearbeiten |
| FR17 | Epic 5 | Status ändern |
| FR18 | Epic 5 | Gerät löschen |
| FR19 | Epic 5 | Lösch-Schutz |
| FR20 | Epic 6 | Historie aller Geräte |
| FR21 | Epic 6 | Historie-Details |
| FR22 | Epic 6 | CSV-Export |
| FR23 | Epic 6 | Filter Gerät/Zeitraum |
| FR24 | Epic 6 | Dashboard-Statistiken |
| FR25 | Epic 6 | Aktive Ausleihen im Dashboard |
| FR26 | Epic 1 | Dark/Light Mode |
| FR27 | Epic 1 | Touch-optimiertes Interface |
| FR28 | Epic 1 | Responsive Tablet/Desktop |

## Epic List

### Epic 1: Projekt-Foundation & Infrastruktur
Entwicklungs-Infrastruktur steht, Basis-UI mit Theme-Toggle und touch-optimiertem Layout funktioniert. Nutzer können die App öffnen, sehen ein funktionierendes Interface mit Dark/Light Mode und responsivem Tablet-Layout.
**FRs covered:** FR26, FR27, FR28

### Epic 2: Geräte-Übersicht & Live-Status
Alle Nutzer können jederzeit den aktuellen Status aller Funkgeräte einsehen. Sandra im FüKw sieht auf einen Blick: Welche Geräte verfügbar, welche ausgeliehen, welche defekt. Die Frage "Wer hat 4-23?" ist in 5 Sekunden beantwortet.
**FRs covered:** FR10, FR11, FR12, FR13

### Epic 3: Geräteausleihe
Helfer können in unter 30 Sekunden ein Funkgerät ausleihen. Tim tippt auf ein Gerät, gibt seinen Namen ein (Autocomplete nach 2 Zeichen), bestätigt – fertig. 12 Sekunden, dokumentiert.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 4: Geräterückgabe
Helfer können ausgeliehene Geräte unkompliziert zurückgeben. Tim sieht sein ausgeliehenes Gerät, tippt drauf, optional "Akku schwach" als Notiz, bestätigt. Done.
**FRs covered:** FR6, FR7, FR8, FR9

### Epic 5: Admin-Authentifizierung & Geräteverwaltung
Admins können sich anmelden und den Gerätebestand verwalten. Klaus loggt sich ein, legt neue Funkgeräte an, markiert defekte als "Wartung".
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19

### Epic 6: Admin-Dashboard, Historie & Reporting
Admins haben volle Transparenz über alle Ausleihen mit Export-Möglichkeit. Klaus sieht Dashboard-Statistiken, checkt Historie, exportiert Monatsübersicht als CSV.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25

---

## Epic 1: Projekt-Foundation & Infrastruktur

Entwicklungs-Infrastruktur steht, Basis-UI mit Theme-Toggle und touch-optimiertem Layout funktioniert. Nutzer können die App öffnen, sehen ein funktionierendes Interface mit Dark/Light Mode und responsivem Tablet-Layout.

### Story 1.1: Monorepo-Initialisierung & Shared Package

Als ein **Entwickler**,
möchte ich **eine funktionsfähige Monorepo-Struktur mit Shared-Types-Package**,
damit **Frontend und Backend typsicher kommunizieren und ich mit der Entwicklung beginnen kann**.

**Acceptance Criteria:**

**Given** ein leeres Projektverzeichnis
**When** ich das Setup ausführe
**Then** existiert eine pnpm-workspace.yaml mit apps/* und packages/*
**And** packages/shared enthält Zod-Schemas für Device, Loan, Borrower
**And** TypeScript-Typen werden aus Zod-Schemas inferiert
**And** pnpm install funktioniert ohne Fehler

### Story 1.2: Backend-Grundstruktur mit Prisma & PostgreSQL

Als ein **Entwickler**,
möchte ich **ein lauffähiges NestJS-Backend mit Prisma und PostgreSQL**,
damit **ich API-Endpoints entwickeln kann**.

**Acceptance Criteria:**

**Given** die Monorepo-Struktur aus Story 1.1
**When** ich docker-compose up ausführe
**Then** startet PostgreSQL in einem Container
**And** das NestJS-Backend ist unter localhost:3000 erreichbar
**And** Prisma-Schema enthält Device und Loan Models
**And** prisma migrate dev erstellt die Tabellen erfolgreich
**And** ein Health-Check-Endpoint GET /api/health antwortet mit 200

### Story 1.3: Frontend-Grundstruktur mit TanStack Router & Theme

Als ein **Nutzer**,
möchte ich **die App im Browser öffnen und zwischen Dark/Light Mode wechseln**,
damit **ich die App bei verschiedenen Lichtverhältnissen nutzen kann** (FR26).

**Acceptance Criteria:**

**Given** ein gestartetes Frontend (pnpm dev)
**When** ich localhost:5173 im Browser öffne
**Then** sehe ich eine Basis-App mit Navigation (Ausleihen, Zurückgeben, Übersicht)
**And** Dark Mode ist standardmäßig aktiv
**And** ich kann per Toggle zu Light Mode wechseln
**And** die Theme-Einstellung wird im localStorage persistiert
**And** TanStack Router ist konfiguriert mit Routes für /, /loan, /return

### Story 1.4: Touch-optimiertes Basis-Layout & shadcn/ui Setup

Als ein **Helfer im Einsatz**,
möchte ich **große, gut erreichbare Buttons auf meinem Tablet**,
damit **ich die App auch mit Handschuhen bedienen kann** (FR27, FR28).

**Acceptance Criteria:**

**Given** die Frontend-App aus Story 1.3
**When** ich die App auf einem Tablet (768px+) öffne
**Then** sind alle Touch-Targets mindestens 44x44px groß
**And** die Navigation nutzt Bottom-Tabs im Tablet-Format
**And** shadcn/ui Button, Card, Input Komponenten sind installiert
**And** Tailwind CSS v4 ist konfiguriert mit custom Touch-Target-Klassen
**And** das Layout ist responsive (Tablet-first, Desktop-Support)

---

## Epic 2: Geräte-Übersicht & Live-Status

Alle Nutzer können jederzeit den aktuellen Status aller Funkgeräte einsehen. Sandra im FüKw sieht auf einen Blick: Welche Geräte verfügbar, welche ausgeliehen, welche defekt.

### Story 2.1: Backend API für Geräte & Ausleihen

Als ein **Frontend-Entwickler**,
möchte ich **API-Endpoints für Geräte und aktive Ausleihen**,
damit **ich die Übersicht im Frontend anzeigen kann**.

**Acceptance Criteria:**

**Given** das laufende Backend aus Epic 1
**When** ich GET /api/devices aufrufe
**Then** erhalte ich eine Liste aller Geräte mit id, callSign, serialNumber, deviceType, status, notes
**And** GET /api/loans/active liefert alle aktiven Ausleihen mit device, borrowerName, borrowedAt
**And** die Response folgt dem Format { data: [...] }
**And** Swagger-Dokumentation ist unter /api/docs erreichbar

### Story 2.2: Geräte-Übersicht mit Live-Status

Als ein **FüKw-Personal**,
möchte ich **auf einen Blick sehen, welche Geräte verfügbar, ausgeliehen oder defekt sind**,
damit **ich sofort weiß, was ich ausgeben kann** (FR10, FR11, FR13).

**Acceptance Criteria:**

**Given** ich öffne die App auf der Übersicht-Seite (/)
**When** die Seite geladen ist
**Then** sehe ich alle Geräte in einem Grid/Liste
**And** jedes Gerät zeigt: Rufname, Status-Badge (farbcodiert), Ausleiher (falls ausgeliehen), Ausleihe-Zeitpunkt
**And** verfügbare Geräte haben einen grünen Badge
**And** ausgeliehene Geräte haben einen orangenen Badge mit Ausleihername
**And** defekte Geräte haben einen roten Badge
**And** Geräte sind sortiert: verfügbar oben, dann ausgeliehen, dann defekt

### Story 2.3: Manuelles Refresh der Übersicht

Als ein **Nutzer**,
möchte ich **die Geräteliste manuell aktualisieren können**,
damit **ich den aktuellen Stand sehe, wenn jemand anderes gerade ausgeliehen hat** (FR12).

**Acceptance Criteria:**

**Given** ich bin auf der Übersicht-Seite
**When** ich den Refresh-Button tippe oder Pull-to-Refresh ausführe
**Then** werden die Daten neu vom Backend geladen
**And** ich sehe einen kurzen Loading-Indikator während des Ladens
**And** die Liste aktualisiert sich mit den neuen Daten
**And** bei Netzwerkfehler erscheint eine benutzerfreundliche Fehlermeldung (NFR7)

---

## Epic 3: Geräteausleihe

Helfer können in unter 30 Sekunden ein Funkgerät ausleihen. Tim tippt auf ein Gerät, gibt seinen Namen ein (Autocomplete nach 2 Zeichen), bestätigt – fertig.

### Story 3.1: Backend API für Ausleihe & Borrower-Suggestions

Als ein **Frontend-Entwickler**,
möchte ich **API-Endpoints zum Erstellen von Ausleihen und für Name-Autocomplete**,
damit **ich den Ausleihe-Flow im Frontend implementieren kann**.

**Acceptance Criteria:**

**Given** das laufende Backend mit Device/Loan Models
**When** ich POST /api/loans mit { deviceId, borrowerName } aufrufe
**Then** wird eine neue Ausleihe erstellt mit automatischem Zeitstempel (FR5)
**And** der Device-Status wird auf ON_LOAN gesetzt
**And** die Response enthält die erstellte Ausleihe
**And** GET /api/borrowers/suggestions?q=Ti liefert passende Namen aus bisherigen Ausleihen
**And** bei bereits ausgeliehenem Gerät wird 409 Conflict zurückgegeben

### Story 3.2: Geräteauswahl für Ausleihe

Als ein **Helfer**,
möchte ich **ein verfügbares Funkgerät aus einer Liste auswählen**,
damit **ich weiß, welches Gerät ich nehme** (FR1).

**Acceptance Criteria:**

**Given** ich bin auf der Ausleihen-Seite (/loan)
**When** die Seite geladen ist
**Then** sehe ich alle verfügbaren Geräte als große, tippbare Karten
**And** ausgeliehene/defekte Geräte sind ausgegraut und nicht wählbar
**And** ich kann ein Gerät durch Tippen auswählen
**And** das ausgewählte Gerät ist visuell hervorgehoben (Border/Hintergrund)
**And** nach Auswahl scrollt die Ansicht zum Namenseingabe-Feld

### Story 3.3: Namenseingabe mit Autocomplete

Als ein **Helfer**,
möchte ich **meinen Namen schnell eingeben mit Vorschlägen aus bisherigen Ausleihen**,
damit **ich nicht jedes Mal alles tippen muss** (FR2, FR3).

**Acceptance Criteria:**

**Given** ich habe ein Gerät ausgewählt
**When** ich anfange meinen Namen zu tippen
**Then** erscheinen nach 2 Zeichen Autocomplete-Vorschläge
**And** die Vorschläge basieren auf bisherigen Ausleihern (GET /api/borrowers/suggestions)
**And** ich kann einen Vorschlag durch Tippen übernehmen
**And** ich kann auch einen neuen Namen eingeben (Freitext)
**And** das Input-Feld hat mindestens 56px Höhe (Touch-optimiert)

### Story 3.4: Ausleihe bestätigen mit Optimistic UI

Als ein **Helfer**,
möchte ich **die Ausleihe mit einem Klick bestätigen und sofort Feedback sehen**,
damit **ich weiß, dass die Ausleihe erfolgreich war** (FR4).

**Acceptance Criteria:**

**Given** ich habe ein Gerät ausgewählt und meinen Namen eingegeben
**When** ich den "Ausleihen"-Button tippe
**Then** wird der Button sofort als "wird gespeichert" angezeigt (< 100ms)
**And** die Ausleihe wird optimistisch im UI reflektiert
**And** bei Erfolg erscheint eine Bestätigungsanzeige: "Florian 4-23 ausgeliehen an Tim S."
**And** nach 2 Sekunden werde ich automatisch zur Übersicht weitergeleitet
**And** bei API-Fehler wird die optimistische Änderung zurückgerollt und ein Toast zeigt den Fehler

---

## Epic 4: Geräterückgabe

Helfer können ausgeliehene Geräte unkompliziert zurückgeben. Tim sieht sein ausgeliehenes Gerät, tippt drauf, optional "Akku schwach" als Notiz, bestätigt. Done.

### Story 4.1: Backend API für Rückgabe

Als ein **Frontend-Entwickler**,
möchte ich **einen API-Endpoint zum Zurückgeben von Geräten**,
damit **ich den Rückgabe-Flow im Frontend implementieren kann**.

**Acceptance Criteria:**

**Given** das laufende Backend mit einer aktiven Ausleihe
**When** ich DELETE /api/loans/:id mit optionalem { returnNote } aufrufe
**Then** wird die Ausleihe als zurückgegeben markiert (returnedAt Zeitstempel gesetzt, FR9)
**And** der Device-Status wird auf AVAILABLE zurückgesetzt
**And** die optionale Zustandsnotiz wird gespeichert
**And** die Response enthält die aktualisierte Ausleihe
**And** bei nicht existierender Ausleihe wird 404 zurückgegeben

### Story 4.2: Eigene ausgeliehene Geräte anzeigen

Als ein **Helfer**,
möchte ich **meine aktuell ausgeliehenen Geräte sehen**,
damit **ich weiß, was ich zurückgeben muss** (FR6).

**Acceptance Criteria:**

**Given** ich bin auf der Zurückgeben-Seite (/return)
**When** ich meinen Namen eingebe (mit Autocomplete)
**Then** sehe ich nur die Geräte, die auf meinen Namen ausgeliehen sind
**And** jedes Gerät zeigt: Rufname, Ausleihe-Zeitpunkt
**And** bei keinen Ausleihen auf meinen Namen sehe ich: "Keine Geräte ausgeliehen"
**And** die Liste aktualisiert sich live bei Namenseingabe

### Story 4.3: Gerät zurückgeben mit optionaler Notiz

Als ein **Helfer**,
möchte ich **ein Gerät mit einem Klick zurückgeben und optional eine Zustandsnotiz hinterlassen**,
damit **ich Probleme wie "Akku schwach" melden kann** (FR7, FR8).

**Acceptance Criteria:**

**Given** ich sehe meine ausgeliehenen Geräte
**When** ich auf ein Gerät tippe
**Then** öffnet sich ein Rückgabe-Dialog mit optionalem Notizfeld
**And** ich kann direkt "Zurückgeben" tippen (Notiz überspringen)
**And** oder ich kann eine Notiz eingeben und dann bestätigen
**And** bei Erfolg erscheint eine Bestätigung: "Florian 4-23 zurückgegeben"
**And** das Gerät verschwindet aus meiner Liste
**And** bei API-Fehler erscheint ein Toast mit Fehlermeldung

---

## Epic 5: Admin-Authentifizierung & Geräteverwaltung

Admins können sich anmelden und den Gerätebestand verwalten. Klaus loggt sich ein, legt neue Funkgeräte an, markiert defekte als "Wartung".

### Story 5.1: Backend Admin-Authentifizierung

Als ein **Admin**,
möchte ich **mich sicher am Admin-Bereich anmelden können**,
damit **nur autorisierte Personen Geräte verwalten können** (FR14, NFR8, NFR9).

**Acceptance Criteria:**

**Given** das laufende Backend
**When** ich POST /api/admin/auth/login mit { username, password } aufrufe
**Then** wird bei korrekten Credentials eine Session erstellt
**And** ein HttpOnly Session-Cookie wird gesetzt
**And** POST /api/admin/auth/logout beendet die Session
**And** GET /api/admin/auth/session prüft ob eine gültige Session existiert
**And** Sessions laufen nach 24h Inaktivität ab
**And** alle /api/admin/* Endpoints (außer login) erfordern gültige Session

### Story 5.2: Admin-Login UI

Als ein **Admin**,
möchte ich **mich über ein Login-Formular anmelden können**,
damit **ich auf den Admin-Bereich zugreifen kann** (FR14).

**Acceptance Criteria:**

**Given** ich bin nicht eingeloggt und navigiere zu /admin
**When** die Seite lädt
**Then** werde ich zum Login-Formular (/admin/login) weitergeleitet
**And** ich sehe Eingabefelder für Benutzername und Passwort
**And** bei korrektem Login werde ich zum Admin-Dashboard weitergeleitet
**And** bei falschem Login erscheint eine Fehlermeldung
**And** das Formular ist touch-optimiert (große Inputs, min. 44px)

### Story 5.3: Backend CRUD für Geräte (Admin)

Als ein **Admin**,
möchte ich **Geräte über die API verwalten können**,
damit **ich den Gerätebestand pflegen kann** (FR15, FR16, FR17, FR18, FR19).

**Acceptance Criteria:**

**Given** ich bin als Admin eingeloggt
**When** ich POST /api/admin/devices mit { callSign, serialNumber, deviceType, notes } aufrufe
**Then** wird ein neues Gerät erstellt (FR15)
**And** PATCH /api/admin/devices/:id aktualisiert Gerätedaten (FR16)
**And** PATCH /api/admin/devices/:id/status ändert den Status (FR17)
**And** DELETE /api/admin/devices/:id löscht ein Gerät (FR18)
**And** DELETE auf ein ausgeliehenes Gerät gibt 409 Conflict zurück (FR19)
**And** alle Endpoints validieren mit Zod-Schemas

### Story 5.4: Admin Geräteverwaltung UI

Als ein **Admin**,
möchte ich **Geräte in einer Tabelle sehen und verwalten können**,
damit **ich neue Geräte anlegen und bestehende bearbeiten kann** (FR15, FR16, FR17, FR18).

**Acceptance Criteria:**

**Given** ich bin als Admin eingeloggt und auf /admin/devices
**When** die Seite lädt
**Then** sehe ich eine Tabelle aller Geräte (Rufname, Seriennummer, Typ, Status)
**And** ich kann "Neues Gerät" klicken und ein Formular ausfüllen
**And** ich kann ein Gerät bearbeiten (Inline oder Modal)
**And** ich kann den Status eines Geräts ändern (Dropdown: Verfügbar, Defekt, Wartung)
**And** ich kann ein Gerät löschen (mit Bestätigungsdialog)
**And** bei ausgeliehenem Gerät ist der Löschen-Button deaktiviert mit Tooltip

---

## Epic 6: Admin-Dashboard, Historie & Reporting

Admins haben volle Transparenz über alle Ausleihen mit Export-Möglichkeit. Klaus sieht Dashboard-Statistiken, checkt Historie, exportiert Monatsübersicht als CSV.

### Story 6.1: Backend API für Dashboard & Historie

Als ein **Admin**,
möchte ich **API-Endpoints für Dashboard-Statistiken und Ausleihe-Historie**,
damit **ich volle Transparenz über alle Vorgänge habe** (FR20, FR21, FR23, FR24, FR25).

**Acceptance Criteria:**

**Given** ich bin als Admin eingeloggt
**When** ich GET /api/admin/dashboard aufrufe
**Then** erhalte ich Statistiken: availableCount, onLoanCount, defectCount, maintenanceCount (FR24)
**And** die Response enthält eine Liste der aktuell ausgeliehenen Geräte mit Ausleihern (FR25)
**And** GET /api/admin/history liefert alle Ausleihen (aktiv + abgeschlossen) (FR20)
**And** jeder Historie-Eintrag enthält: device, borrowerName, borrowedAt, returnedAt, returnNote (FR21)
**And** GET /api/admin/history?deviceId=X filtert nach Gerät (FR23)
**And** GET /api/admin/history?from=DATE&to=DATE filtert nach Zeitraum (FR23)

### Story 6.2: Admin Dashboard UI

Als ein **Admin**,
möchte ich **auf einen Blick den aktuellen Status aller Geräte sehen**,
damit **ich weiß, wie viele Geräte verfügbar, ausgeliehen oder defekt sind** (FR24, FR25).

**Acceptance Criteria:**

**Given** ich bin als Admin eingeloggt und auf /admin
**When** die Seite lädt
**Then** sehe ich Statistik-Karten: Verfügbar (grün), Ausgeliehen (orange), Defekt (rot), Wartung (grau)
**And** jede Karte zeigt die Anzahl prominent
**And** darunter sehe ich eine Liste der aktuell ausgeliehenen Geräte mit Namen und Zeitpunkt
**And** die Daten werden beim Laden frisch vom Backend geholt

### Story 6.3: Admin Historie UI mit Filter

Als ein **Admin**,
möchte ich **die komplette Ausleihe-Historie einsehen und filtern können**,
damit **ich nachvollziehen kann, wer ein Gerät zuletzt hatte** (FR20, FR21, FR23).

**Acceptance Criteria:**

**Given** ich bin als Admin eingeloggt und auf /admin/history
**When** die Seite lädt
**Then** sehe ich eine Tabelle aller Ausleihen (neueste zuerst)
**And** jede Zeile zeigt: Gerät, Ausleiher, Ausleihe-Zeit, Rückgabe-Zeit, Zustandsnotiz
**And** ich kann nach Gerät filtern (Dropdown oder Suche)
**And** ich kann nach Zeitraum filtern (Datepicker: Von/Bis)
**And** aktive Ausleihen (ohne Rückgabe) sind visuell hervorgehoben

### Story 6.4: CSV-Export der Historie

Als ein **Admin**,
möchte ich **die Ausleihe-Historie als CSV exportieren können**,
damit **ich die Daten extern weiterverarbeiten kann** (FR22).

**Acceptance Criteria:**

**Given** ich bin auf der Historie-Seite mit optional gesetzten Filtern
**When** ich den "CSV Export"-Button klicke
**Then** wird eine CSV-Datei heruntergeladen
**And** die CSV enthält die aktuell gefilterten Daten
**And** Spalten: Gerät, Seriennummer, Ausleiher, Ausleihe-Datum, Rückgabe-Datum, Notiz
**And** das Dateiformat ist korrekt (Semikolon-getrennt für Excel-Kompatibilität)
**And** der Dateiname enthält das aktuelle Datum: historie_2025-12-14.csv
