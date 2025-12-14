---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - 'docs/analysis/product-brief-radio-inventar-2025-12-13.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
lastStep: 11
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-13'
---

# Product Requirements Document - radio-inventar

**Author:** Ruben
**Date:** 2025-12-13

## Executive Summary

**radio-inventar** ist eine minimalistische Webapp zur Dokumentation von Funkgeräte-Ausleihen im Katastrophenschutz. Die Lösung adressiert ein hartnäckiges Problem: Niemand dokumentiert, wer welches Funkgerät hat – weil selbst eine analoge Liste im Einsatzstress zu umständlich ist.

Die App setzt auf radikale Einfachheit: Zwei Kernfunktionen (Ausleihen/Zurückgeben), keine Anmeldung für Helfer, touch-optimiert für Tablet-Nutzung im Führungskraftwagen (FüKw). Das Ziel ist eine Dokumentationsquote von 80%+ durch eine Lösung, die schneller ist als Wegschauen.

**Zielnutzer:**
- **Helfer/Gruppenführer** – Selbstbedienung in unter 30 Sekunden
- **FüKw-Personal** – Ausgabe im Einsatz mit Überblick
- **Nebenbei-Admin** – Gelegentliche Geräteverwaltung

### Was macht es besonders

- **Einfacher als Papier** – Weniger Schritte als die analoge Liste
- **Kein Login für Helfer** – Null Hürden bei der Nutzung
- **Touch-optimiert** – Große Buttons, nutzbar mit Handschuhen im Einsatz
- **Fokussiert** – Nur das Nötigste, keine Feature-Überladung

## Project Classification

**Technical Type:** web_app
**Domain:** general
**Complexity:** low
**Project Context:** Greenfield - neues Projekt

Einfache, fokussierte Webanwendung ohne komplexe regulatorische Anforderungen. Browser-basiert, optimiert für Tablet-Nutzung im Feld.

## Success Criteria

### User Success

| Metrik | Ziel | Messung |
|--------|------|---------|
| Ausleihe-Geschwindigkeit | < 30 Sekunden | Zeit von App-Öffnen bis Bestätigung |
| Übersicht-Klarheit | Jederzeit aktuell | Live-Liste: Wer hat welches Gerät |
| Rückgabe-Erfolg | Keine "vergessenen" Geräte | Alle Geräte am Ende zurückgebucht |

**Aha-Momente:**
- Ausleihen: "Fertig? Das war's schon?"
- Überblick: "Der Max hat's – ich frag ihn direkt"
- Rückgabe: "Ein Klick – done"

### Business Success

| Ziel | Erfolgskriterium |
|------|------------------|
| Dokumentationsquote | Von 40% → 80%+ (Verdopplung) |
| Historie verfügbar | Letzter Nutzer jedes Geräts nachvollziehbar |
| Einsatz-Tauglichkeit | Mind. 1 echter Einsatz erfolgreich dokumentiert |

### Technical Success

| Metrik | Ziel |
|--------|------|
| Verfügbarkeit | System erreichbar während Übungen/Einsätzen |
| Ladezeit | < 2 Sekunden auf Tablet |
| Touch-Bedienbarkeit | Nutzbar mit Handschuhen |

### Measurable Outcomes

**Primäre KPIs:**
- Adoptionsrate: Nutzung bei Übungen UND Einsätzen
- Dokumentationsquote: 80%+ aller Ausleihen erfasst
- Geräte-Accountability: Bei Verlust/Defekt → letzter Nutzer identifizierbar

**Sekundäre KPIs:**
- Admin-Aufwand: < 5 Min/Woche für Stammdatenpflege
- Fehlerfreiheit: Keine "Geister-Ausleihen"

## Product Scope

### MVP - Minimum Viable Product

**Helfer-Bereich (ohne Login):**
- Funkgerät ausleihen: Gerät wählen → Name eingeben → Bestätigen
- Funkgerät zurückgeben: Eigenes Gerät wählen → Optional Zustandsnotiz → Bestätigen
- Helfername-Eingabe: Freitext mit Autocomplete
- Live-Übersicht: Alle aktuell ausgeliehenen Geräte

**Admin-Bereich (mit Login):**
- Geräteverwaltung: Hinzufügen, Bearbeiten, Löschen
- Geräte-Felder: Rufname, Seriennummer, Gerätetyp, Status, Notizen
- Ausleihe-Historie: Einsehen und Export (CSV)
- Dashboard: Anzahl verfügbar / ausgeliehen / defekt

**UI/UX:**
- Touch-optimiert (große Buttons, Tablet-tauglich)
- Dark Mode
- Farbcodierung: Verfügbar (grün), Ausgeliehen (orange), Defekt (rot)

### Growth Features (Post-MVP)

- E-Mail-Benachrichtigung wenn Gerät > X Stunden ausgeliehen
- Inventur-Modus zum systematischen Durchzählen

### Vision (Future)

- Funktionsverwaltung (erweiterter Gerätestatus)
- Geräte-Attribute (Repeater, Gateway, etc.)

### Out of Scope

| Feature | Begründung |
|---------|------------|
| QR-Code-Scanner | Kein Mehrwert für den Use Case |
| PWA / Offline | Backend auf Server, Internet vorausgesetzt |
| Mehrere Standorte | Nicht benötigt |

## User Journeys

### Journey 1: Tim Schäfer – Der Helfer, der nur schnell ein Funkgerät braucht

Tim ist seit 3 Jahren ehrenamtlicher Helfer beim DRK. Heute ist Samstag, 8:45 Uhr – in 15 Minuten beginnt die Großübung. Er kommt am FüKw an, wo bereits 20 andere Helfer warten. Der Schrank mit den Funkgeräten ist offen, ein Tablet hängt daneben.

Früher hätte Tim jetzt die Papierliste ignoriert – zu umständlich, zu viele Leute, kein Kugelschreiber da. Heute tippt er auf "Ausleihen", wählt "Florian 4-23" aus der Liste, tippt "Tim S" ein (das System schlägt nach zwei Buchstaben seinen Namen vor), und drückt "Bestätigen".

12 Sekunden. Das Gerät ist dokumentiert, Tim ist weg zur Truppe.

Am Ende der Übung, 6 Stunden später, kommt Tim zurück zum FüKw. Er tippt auf "Zurückgeben", sieht sofort sein ausgeliehenes Gerät, tippt drauf, schreibt "Akku schwach" in die optionale Notiz, bestätigt. Fertig.

Tim denkt: "Das war ja einfacher als Wegschauen."

### Journey 2: Sandra Müller – Die FüKw-Besatzung im Einsatzmodus

Sandra sitzt im FüKw bei einem echten Einsatz. Es ist 22:30 Uhr, Unwetterlage, ständig kommen Helfer und brauchen Funk. Sie hat das Tablet vor sich, während sie parallel Funk abhört und Lagekarten aktualisiert.

Ein Helfer steckt den Kopf rein: "Brauch Funk!" Sandra schaut aufs Tablet, sieht die grünen verfügbaren Geräte: "Nimm Florian 4-11. Name?" – "Meier, Kevin." Sandra tippt es ein, 8 Sekunden, weiter geht's.

Eine Stunde später fragt der Einsatzleiter: "Wer hat 4-23? Brauchen Rückmeldung." Sandra schaut auf die Live-Übersicht: "Tim Schäfer, Gruppe 2." Problem gelöst.

Am Ende des Einsatzes checkt Sandra das Dashboard: 3 Geräte noch draußen. Sie weiß genau bei wem – und kann gezielt nachfragen statt jeden anzurufen.

### Journey 3: Klaus Berger – Der Admin, der es nebenbei macht

Klaus ist Materialwart beim OV. Einmal im Monat, meist sonntagabends nach dem Dienst, pflegt er die Geräteliste. Heute hat die Organisation zwei neue Funkgeräte bekommen.

Klaus öffnet den Admin-Bereich (eingeloggt bleibt er sowieso auf seinem Laptop), klickt "Neues Gerät", trägt Rufname, Seriennummer und Gerätetyp ein. Zwei Minuten pro Gerät.

Dann schaut er in die Historie: "Florian 4-07 – letzter Nutzer vor dem Defekt war... aha." Er markiert das Gerät als "Wartung" und macht eine Notiz für den technischen Dienst.

Gesamtaufwand diese Woche: 8 Minuten. Klaus denkt: "Endlich weiß ich, wo die Geräte sind."

### Journey Requirements Summary

| Journey | Revealed Requirements |
|---------|----------------------|
| Tim (Helfer) | Ausleihen-Flow, Name-Autocomplete, Rückgabe-Flow, Zustandsnotiz |
| Sandra (FüKw) | Live-Übersicht, Schnelle Ausgabe, Suche "wer hat was", Dashboard |
| Klaus (Admin) | Geräteverwaltung, Historie, Status ändern, Notizen |

## Web-App Specific Requirements

### Project-Type Overview

**radio-inventar** wird als Single-Page-Application (SPA) implementiert. Dies ermöglicht schnelle, flüssige Interaktionen ohne Page-Reloads – kritisch für das Ziel der 30-Sekunden-Ausleihe.

### Browser Support

| Anforderung | Spezifikation |
|-------------|---------------|
| Ziel-Browser | Moderne Browser (Chrome, Safari, Firefox, Edge) |
| Legacy-Support | Nicht erforderlich |
| Primäres Gerät | Tablet (iPad, Android) |
| Desktop | Unterstützt für Admin-Bereich |

### Technical Architecture Considerations

| Aspekt | Entscheidung | Begründung |
|--------|--------------|------------|
| App-Typ | SPA | Schnelle Interaktionen, kein Page-Reload |
| SEO | Nicht benötigt | Internes Tool, kein öffentlicher Zugang |
| Real-Time | Manuelles Refresh | Einfachheit, kein WebSocket-Overhead |
| Offline | Nicht benötigt | Internet vorausgesetzt |

### Responsive Design

| Breakpoint | Zielgerät | Priorität |
|------------|-----------|-----------|
| Tablet (768px+) | iPad, Android-Tablets im FüKw | Primär |
| Desktop (1024px+) | Admin-Bereich, Laptop | Sekundär |
| Mobile (<768px) | Smartphones | Nice-to-have |

### Performance Targets

| Metrik | Ziel |
|--------|------|
| Initial Load | < 3 Sekunden |
| Interaktion (Ausleihen) | < 500ms Feedback |
| Time to Interactive | < 2 Sekunden |

### Implementation Considerations

- **Framework:** Moderne SPA-Frameworks (React, Vue, Svelte) geeignet
- **State Management:** Einfach halten – lokaler State + API-Calls reichen
- **API-Design:** REST ausreichend, kein GraphQL-Overhead nötig
- **Caching:** Browser-Cache für statische Assets, API-Responses nicht cachen (Aktualität wichtig)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
Löst das Kernproblem (fehlende Dokumentation) mit minimalem, aber vollständigem Feature-Set.

**Scope Assessment:** Simple MVP
- Kleines Team (1-2 Entwickler)
- Fokussierter Use Case
- Klare Grenzen

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Tim (Helfer): Komplette Ausleihe/Rückgabe Journey
- Sandra (FüKw): Ausgabe + Überblick Journey
- Klaus (Admin): Geräteverwaltung Journey

**Must-Have Capabilities:**

| Bereich | Features |
|---------|----------|
| Helfer-Bereich | Ausleihen, Zurückgeben, Name-Autocomplete, Zustandsnotiz |
| Live-Übersicht | Wer hat was, Farbcodierung, Refresh |
| Admin-Bereich | Login, Geräteverwaltung (CRUD), Historie, CSV-Export, Dashboard |
| UI/UX | Touch-optimiert, Dark Mode, Responsive (Tablet-first) |

### Post-MVP Features

**Phase 2 (Growth):**
- E-Mail-Benachrichtigung bei langer Ausleihe
- Inventur-Modus

**Phase 3 (Expansion):**
- Funktionsverwaltung (erweiterter Gerätestatus)
- Geräte-Attribute (Repeater, Gateway, etc.)

### Risk Mitigation Strategy

| Risiko | Mitigation |
|--------|------------|
| **Technisch** | Einfache Architektur (SPA + REST), keine komplexen Features |
| **Adoption** | Radikale Einfachheit – weniger Schritte als Papierliste |
| **Ressourcen** | MVP kann von 1 Entwickler umgesetzt werden |

### Out of Scope (Explizit ausgeschlossen)

| Feature | Begründung |
|---------|------------|
| QR-Code-Scanner | Kein Mehrwert |
| PWA / Offline | Internet vorausgesetzt |
| Mehrere Standorte | Nicht benötigt |
| Nutzer-Accounts für Helfer | Widerspricht "kein Login" Prinzip |

## Functional Requirements

### Geräteausleihe

- FR1: Helfer können ein verfügbares Funkgerät aus einer Liste auswählen
- FR2: Helfer können ihren Namen bei der Ausleihe eingeben
- FR3: System schlägt Namen basierend auf bisherigen Eingaben vor (Autocomplete)
- FR4: Helfer können eine Ausleihe mit einem Klick bestätigen
- FR5: System erfasst Ausleihe-Zeitstempel automatisch

### Geräterückgabe

- FR6: Helfer können ihr ausgeliehenes Gerät in einer persönlichen Liste sehen
- FR7: Helfer können bei der Rückgabe optional eine Zustandsnotiz eingeben
- FR8: Helfer können eine Rückgabe mit einem Klick bestätigen
- FR9: System erfasst Rückgabe-Zeitstempel automatisch

### Live-Übersicht

- FR10: Alle Nutzer können eine Liste aller aktuell ausgeliehenen Geräte einsehen
- FR11: Die Übersicht zeigt pro Gerät: Rufname, Ausleiher, Ausleihe-Zeitpunkt
- FR12: Nutzer können die Übersicht manuell aktualisieren (Refresh)
- FR13: Geräte werden farblich nach Status codiert (verfügbar/ausgeliehen/defekt)

### Geräteverwaltung (Admin)

- FR14: Admins können sich mit Zugangsdaten anmelden
- FR15: Admins können neue Geräte anlegen
- FR16: Admins können Gerätedaten bearbeiten (Rufname, Seriennummer, Gerätetyp, Notizen)
- FR17: Admins können den Gerätestatus ändern (verfügbar, defekt, Wartung)
- FR18: Admins können Geräte löschen
- FR19: System verhindert Löschen von aktuell ausgeliehenen Geräten

### Historie & Reporting (Admin)

- FR20: Admins können die Ausleihe-Historie aller Geräte einsehen
- FR21: Historie zeigt: Gerät, Ausleiher, Ausleihe-Zeit, Rückgabe-Zeit, Zustandsnotiz
- FR22: Admins können die Historie als CSV exportieren
- FR23: Admins können die Historie nach Gerät oder Zeitraum filtern

### Dashboard (Admin)

- FR24: Admins sehen eine Zusammenfassung: Anzahl verfügbar / ausgeliehen / defekt
- FR25: Dashboard zeigt aktuell ausgeliehene Geräte mit Ausleihern

### Benutzeroberfläche

- FR26: Alle Nutzer können zwischen hellem und dunklem Modus wählen
- FR27: Interface ist touch-optimiert mit großen Bedienelementen
- FR28: Interface funktioniert auf Tablets (primär) und Desktop (sekundär)

## Non-Functional Requirements

### Performance

| Anforderung | Ziel | Messung |
|-------------|------|---------|
| NFR1: Seitenladezeit | < 3 Sekunden | Initial Load auf Tablet |
| NFR2: Interaktions-Feedback | < 500ms | Zeit bis visuelles Feedback |
| NFR3: API-Antwortzeit | < 1 Sekunde | Server-Response für CRUD-Operationen |
| NFR4: Ausleihe-Gesamtzeit | < 30 Sekunden | Von App-Öffnen bis Bestätigung (UX-Ziel) |

### Reliability

| Anforderung | Ziel |
|-------------|------|
| NFR5: Verfügbarkeit | System erreichbar während Übungen und Einsätzen |
| NFR6: Datenpersistenz | Keine Datenverluste bei Ausleihe-/Rückgabevorgängen |
| NFR7: Fehlertoleranz | Benutzerfreundliche Fehlermeldungen bei Netzwerkproblemen |

### Security

| Anforderung | Beschreibung |
|-------------|--------------|
| NFR8: Admin-Authentifizierung | Sichere Anmeldung für Admin-Bereich (Passwort-geschützt) |
| NFR9: Session-Management | Admin-Sessions laufen nach Inaktivität ab |
| NFR10: Keine sensiblen Daten | System speichert nur Namen (Freitext), keine personenbezogenen IDs |

### Usability

| Anforderung | Beschreibung |
|-------------|--------------|
| NFR11: Touch-Bedienbarkeit | Buttons mindestens 44x44px für Handschuh-Nutzung |
| NFR12: Lesbarkeit | Ausreichender Kontrast für Nutzung bei verschiedenen Lichtverhältnissen |
| NFR13: Erlernbarkeit | Neue Nutzer können ohne Einweisung ausleihen/zurückgeben |
