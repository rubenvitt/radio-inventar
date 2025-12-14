---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'product-brief'
lastStep: 6
status: complete
completedAt: 2025-12-13
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-13'
---

# Product Brief: radio-inventar

**Date:** 2025-12-13
**Author:** Ruben

---

## Executive Summary

**radio-inventar** ist eine minimalistische Webapp zur Dokumentation von Funkgeräte-Ausleihen im Katastrophenschutz. Die Lösung adressiert ein simples aber hartnäckiges Problem: Niemand dokumentiert, wer welches Funkgerät hat – weil selbst eine analoge Liste zu umständlich ist.

Die App setzt auf radikale Einfachheit: Zwei Buttons (Ausleihen/Zurückgeben), keine Anmeldung für Helfer, touch-optimiert für Tablet-Nutzung im FüKw. Das Ziel ist eine Dokumentationsquote von 80%+ durch eine Lösung, die schneller ist als Wegschauen.

---

## Core Vision

### Problem Statement

Ehrenamtliche Helfer im Katastrophenschutz (z.B. DRK) leihen Funkgeräte aus dem Führungskraftwagen (FüKw) aus, ohne dies zu dokumentieren. Die bestehende analoge Liste wird ignoriert – sie ist im Einsatzstress schlicht zu umständlich.

### Problem Impact

- **Verantwortlichkeit unklar:** Bei Verlust oder Defekt ist nicht nachvollziehbar, wer das Gerät zuletzt hatte
- **Gerätezustand unbekannt:** Probleme wie schwache Akkus werden nicht systematisch erfasst
- **Inventur unmöglich:** Kein Überblick über Verbleib und Status der Geräte

### Why Existing Solutions Fall Short

| Lösung | Problem |
|--------|---------|
| Analoge Liste am Schrank | Zu umständlich – wird nicht genutzt |
| Gar keine Dokumentation | Status quo, führt zu den beschriebenen Problemen |
| Komplexe BOS-Software | Überdimensioniert für diesen Anwendungsfall |

### Proposed Solution

Eine Webapp mit zwei Kernfunktionen:
1. **Ausleihen:** Gerät wählen → Name eingeben → Fertig
2. **Zurückgeben:** Mein Gerät wählen → Optional Zustandsnotiz → Fertig

Dazu ein Admin-Bereich für Geräteverwaltung (Rufname, Seriennummer, Typ, Status) und Ausleihe-Historie.

**Zukünftige Erweiterungen:**
- Funktionsverwaltung (Gerätestatus)
- Geräte-Attribute (Repeater, Gateway, etc.)

### Key Differentiators

- **Einfacher als Papier:** Weniger Schritte als die analoge Liste
- **Kein Login für Helfer:** Null Hürden bei der Nutzung
- **Touch-optimiert:** Große Buttons, nutzbar mit Handschuhen im Einsatz
- **Fokussiert:** Nur das Nötigste, keine Feature-Überladung

---

## Target Users

### Primary Users

**1. Der Helfer / Gruppenführer (Selbstbedienung)**

- **Kontext:** Ehrenamtlicher im Katastrophenschutz (z.B. DRK), 1-5x pro Monat im Einsatz oder bei Übungen
- **Situation:** Kommt zur Übung, braucht ein Funkgerät, will schnell zur Truppe
- **Verhalten:** Kennt die Kollegen, kennt die Geräte, hat keine Zeit für Bürokratie
- **Bedürfnis:** In unter 30 Sekunden ein Gerät haben und dokumentiert sein
- **Pain Point:** Analoge Liste ist zu umständlich → wird ignoriert

**2. Das FüKw-Personal (Ausgabe im Einsatz)**

- **Kontext:** Besetzt den Führungskraftwagen während eines Einsatzes
- **Situation:** Helfer kommen an, brauchen Funk, es ist hektisch
- **Verhalten:** Gibt Geräte aus, behält Überblick, hat parallel andere Aufgaben
- **Workflow-Optionen:**
  - Tablet dem Ausleiher in die Hand drücken → "Trag dich ein"
  - Selbst eintragen → "Name? Gerät X, fertig."
- **Bedürfnis:** Schnelle Ausgabe + Überblick wer was hat

### Secondary Users

**3. Der Nebenbei-Admin (Geräteverwaltung)**

- **Kontext:** Materialwart, GF oder Zugführer – macht Verwaltung nebenbei
- **Situation:** Neues Gerät anschaffen, defektes Gerät markieren, Historie prüfen
- **Frequenz:** Gelegentlich (nicht täglich)
- **Bedürfnis:** Einfache Stammdatenpflege ohne Einarbeitung

### User Journey

| Phase | Helfer (Selbstbedienung) | FüKw-Personal (Einsatz) |
|-------|--------------------------|-------------------------|
| **Zugang** | Tablet am FüKw öffnen | Tablet bereits offen |
| **Ausleihe** | Gerät wählen → Name → Fertig | Tablet weitergeben ODER selbst eintragen |
| **Nutzung** | Funk nutzen im Einsatz/Übung | Überblick behalten (wer hat was) |
| **Rückgabe** | Gerät wählen → Optional Notiz → Fertig | Rückgaben entgegennehmen |
| **Aha-Moment** | "Das war ja einfacher als die Liste!" | "Endlich weiß ich, wo alle Geräte sind" |

---

## Success Metrics

### User Success Metrics

| Metrik | Ziel | Messung |
|--------|------|---------|
| **Ausleihe-Geschwindigkeit** | < 30 Sekunden | Zeit von App-Öffnen bis Bestätigung |
| **Übersicht-Klarheit** | Jederzeit aktuell | Live-Liste: Wer hat welches Gerät |
| **Rückgabe-Erfolg** | Keine "vergessenen" Geräte | Alle Geräte am Ende zurückgebucht |

### Business Objectives

| Ziel | Erfolgskriterium |
|------|------------------|
| **Dokumentationsquote** | 80%+ aller Ausleihen werden erfasst |
| **Historie verfügbar** | Letzter Nutzer jedes Geräts nachvollziehbar |
| **Einsatz-Tauglichkeit** | Mindestens 1 echter Einsatz erfolgreich mit App dokumentiert (Proof of Concept) |

### Key Performance Indicators

**Primäre KPIs:**
- **Adoptionsrate:** Wird die App bei Übungen UND Einsätzen genutzt?
- **Dokumentationsquote:** % der Ausleihen, die erfasst werden (Ziel: 80%+)
- **Geräte-Accountability:** Bei Verlust/Defekt → letzter Nutzer identifizierbar

**Sekundäre KPIs:**
- **Admin-Aufwand:** Stammdatenpflege bleibt minimal (< 5 Min/Woche)
- **Fehlerfreiheit:** Keine "Geister-Ausleihen" (ausgeliehen aber Gerät da)

---

## MVP Scope

### Core Features

**Helfer-Bereich (ohne Login):**
- Funkgerät ausleihen: Gerät wählen → Name eingeben → Bestätigen
- Funkgerät zurückgeben: Eigenes Gerät wählen → Optional Zustandsnotiz → Bestätigen
- Helfername-Eingabe: Freitext mit Autocomplete (aus bisherigen Namen)
- Live-Übersicht: Liste aller aktuell ausgeliehenen Geräte (wer hat was seit wann)

**Admin-Bereich (mit Login):**
- Geräteverwaltung: Hinzufügen, Bearbeiten, Löschen
- Geräte-Felder: Rufname/Kennung, Seriennummer, Gerätetyp, Status (verfügbar/ausgeliehen/defekt/Wartung), Notizen
- Ausleihe-Historie: Einsehen und Export (CSV)
- Dashboard: Anzahl verfügbar / ausgeliehen / defekt

**UI/UX:**
- Touch-optimiert (große Buttons, Tablet-tauglich)
- Dark Mode
- Farbcodierung: Verfügbar (grün), Ausgeliehen (orange), Defekt (rot)

### Out of Scope for MVP

| Feature | Begründung |
|---------|------------|
| QR-Code-Scanner | Gestrichen – kein Mehrwert für den Use Case |
| E-Mail-Benachrichtigung | v2.0 – nice-to-have, nicht kritisch |
| Inventur-Modus | v2.0 – Zusatzfunktion für später |
| PWA / Offline | Nicht nötig – Backend auf Server, Internet vorausgesetzt |
| Mehrere Standorte | Gestrichen – nicht benötigt |

### MVP Success Criteria

**Go-Live-Kriterium:** Alle oben genannten Core Features sind implementiert und funktionsfähig.

**Validierung nach Go-Live:**
- Erste Nutzung bei einer Übung erfolgreich
- Erste Nutzung bei einem echten Einsatz (Proof of Concept)
- Dokumentationsquote steigt erkennbar gegenüber analoger Liste

### Future Vision

**Version 2.0:**
- E-Mail-Benachrichtigung wenn Gerät > X Stunden ausgeliehen
- Inventur-Modus zum systematischen Durchzählen

**Langfristig:**
- Funktionsverwaltung (Gerätestatus erweitert)
- Geräte-Attribute (Repeater, Gateway, etc.)
