---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - 'docs/prd.md'
  - 'docs/analysis/product-brief-radio-inventar-2025-12-13.md'
workflowType: 'ux-design'
lastStep: 14
status: complete
completedAt: '2025-12-14'
project_name: 'radio-inventar'
user_name: 'Ruben'
date: '2025-12-14'
---

# UX Design Specification - radio-inventar

**Author:** Ruben
**Date:** 2025-12-14

---

## Executive Summary

### Project Vision

radio-inventar schafft ein digitales Erlebnis, das **einfacher ist als Wegschauen**. In der hektischen Realität des Katastrophenschutzes – wenn 20 Helfer gleichzeitig Funkgeräte brauchen, wenn im Einsatz jede Sekunde zählt – muss Dokumentation zur unbewussten Nebensache werden. Die Vision ist ein Interface, das so intuitiv und schnell ist, dass Nutzer gar nicht merken, dass sie dokumentieren. Sie nehmen einfach ihr Funkgerät – und das System erledigt den Rest.

Das Erlebnis soll Erleichterung vermitteln: "Endlich weiß ich, wo die Geräte sind" statt Frustration über komplizierte Software. Es soll Vertrauen schaffen: Die Live-Übersicht zeigt jederzeit die Wahrheit, keine veralteten Listen. Und es soll im Einsatzstress funktionieren – mit Handschuhen, bei schlechtem Licht, unter Zeitdruck.

### Target Users

**1. Helfer/Gruppenführer – Der gestresste Pragmatiker**

*Kontext:* Ehrenamtlich tätig, kommt zu Übungen und Einsätzen nach Feierabend. Hat wenig Zeit, will schnell einsatzbereit sein. Nutzt die App im Vorbeigehen am FüKw.

*Bedürfnisse:* Schnell ein funktionstüchtiges Gerät bekommen, ohne Bürokratie. Wissen, dass das Gerät auf ihn gebucht ist (Absicherung). Am Ende unkompliziert zurückgeben können.

*Pain Points:* Papierlisten sind umständlich – Kugelschreiber fehlt, Liste ist voll gekritzelt, niemand findet sie. Dokumentation kostet Zeit, die man nicht hat. Angst, für ein verlorenes Gerät verantwortlich gemacht zu werden, obwohl man es zurückgegeben hat.

**2. FüKw-Personal – Die multitaskende Koordinatorin**

*Kontext:* Sitzt während Übung/Einsatz im Führungskraftwagen, koordiniert Ressourcen, hört Funk ab, aktualisiert Lagekarten. Unterbricht ständig ihre Arbeit, um Funkgeräte auszugeben.

*Bedürfnisse:* Blitzschnell überblicken, welche Geräte verfügbar sind. Ausleihe in Sekunden erfassen, während drei andere Helfer warten. Auf Nachfrage sofort wissen: "Wer hat Gerät X?"

*Pain Points:* Papierliste liegt irgendwo, ist unübersichtlich, niemand pflegt sie. Bei Nachfragen: "Wer hat 4-23?" muss man alle anrufen. Am Einsatzende fehlen Geräte, aber niemand weiß bei wem.

**3. Nebenbei-Admin – Der gewissenhafte Materialwart**

*Kontext:* Ehrenamtlicher Materialwart, pflegt Gerätestammdaten gelegentlich (einmal im Monat). Arbeitet meist vom eigenen Laptop zuhause nach dem Dienst.

*Bedürfnisse:* Schnell neue Geräte anlegen, defekte markieren, Historie einsehen. Wissen, wer ein Gerät zuletzt hatte (bei Defekt/Verlust). Minimaler Zeitaufwand – es ist unbezahlte Arbeit.

*Pain Points:* Komplizierte Admin-Interfaces mit zu vielen Funktionen. Fehlende Nachvollziehbarkeit: "Wer hatte das Gerät vor dem Defekt?" Zeitfressende Datenpflege.

### Key Design Challenges

**1. Null-Friction Onboarding im Chaos**

In der Einsatzrealität gibt es keine Schulung, kein Tutorial, kein Onboarding. Ein Helfer, der zum ersten Mal vor dem Tablet steht – während hinter ihm 10 weitere warten – muss sofort verstehen, was zu tun ist. Das Interface muss selbsterklärend sein wie ein Fahrkartenautomat, nur schneller.

**2. Touch-Bedienung unter widrigen Bedingungen**

Handschuhe, schlechtes Licht, Zeitdruck, Stress, kalte Finger, Regen auf dem Display. Die App muss unter Bedingungen funktionieren, unter denen selbst Papier versagt. Buttons müssen groß genug für Arbeitshandschuhe sein, Kontraste stark genug für Sonnenlicht, Feedback deutlich genug für Einsatzstress.

**3. Balance zwischen Einfachheit und Überblick**

Die App muss radikal einfach sein (zwei Funktionen: Ausleihen, Zurückgeben) – aber gleichzeitig genug Kontext bieten, dass FüKw-Personal den Überblick behält. Wie zeigt man "wer hat was" ohne Informationsüberflutung? Wie macht man Historie zugänglich ohne Komplexität?

**4. Vertrauen ohne Login schaffen**

Helfer melden sich nicht an – aber müssen trotzdem Vertrauen haben, dass "ihre" Ausleihe gespeichert ist. Wie gibt man Sicherheitsgefühl ohne Account? Wie verhindert man Missbrauch (jemand gibt fremde Geräte zurück) ohne Authentifizierung?

### Design Opportunities

**1. Schneller als die analoge Alternative**

Die Chance, ein digitales Tool zu schaffen, das tatsächlich weniger Schritte hat als Papier und Stift. Durch intelligentes Autocomplete, Farbcodierung, und Ein-Klick-Aktionen kann Dokumentation zur reflexartigen Geste werden – wie das Drücken eines Lichtschalters.

**2. Live-Überblick als Killer-Feature**

Während eine Papierliste immer veraltet ist, kann die digitale Übersicht Echtzeit bieten. "Wer hat 4-23?" – ein Blick, eine Antwort. Diese Superkraft (instant Wissen statt Rumtelefonieren) kann das Tool unverzichtbar machen.

**3. Implizites Lernen durch wiederholte Nutzung**

Helfer nutzen das System bei jeder Übung. Durch konsistente, wiederholte Interaktionen entsteht Muskelgedächtnis: "Ich weiß, wo ich tippen muss, ohne nachzudenken." Autocomplete lernt Namen, Interface wird vertrauter – das System wird mit jeder Nutzung schneller.

**4. Fehlertoleranz als Vertrauensanker**

Durch klares visuelles Feedback ("Florian 4-23 ausgeliehen an Tim S."), einfaches Undo ("Doch nicht? Sofort zurückgeben"), und defensive Validierung ("Gerät schon ausgeliehen? → Warnung") kann die App Vertrauen aufbauen, das analoge Listen nie hatten.

---

## Core User Experience

### Defining Experience

**Die EINE Sache: Ausleihe in unter 30 Sekunden**

Alles andere ist sekundär. Wenn ein Helfer im Einsatzstress nicht innerhalb von 30 Sekunden vom App-Öffnen zur Bestätigungsmeldung kommt, scheitert das Produkt. Diese eine Interaktion – Gerät ausleihen – muss so reibungslos sein wie Atmen.

Konkret bedeutet das:
- Maximal 3 Taps: (1) Gerät wählen, (2) Name eingeben, (3) Bestätigen
- Null Scrollen für die 10 wichtigsten Geräte
- Autocomplete nach 2 Buchstaben
- Visuelles Feedback in < 500ms
- Keine Fehler-Dialoge bei Standardnutzung

Wenn diese eine Sache perfekt funktioniert, werden Helfer das System nutzen. Wenn sie stockt, umständlich ist, oder überfordert, ist die App tot.

### Platform Strategy

**Tablet-First, Touch-Optimiert, Single-Page Application**

Das primäre Nutzungsszenario ist eindeutig: Ein Tablet im Führungskraftwagen, angebracht oder liegend, bedient von Menschen mit und ohne Handschuhe, in wechselnden Lichtverhältnissen, unter Zeitdruck.

**Design-Implikationen:**
- **Touch Targets:** Minimum 44x44px, ideal 60x60px für große Buttons
- **Typografie:** Minimum 18px Schriftgröße, stark kontrastierende Farben
- **Layout:** Vertikal scrollend, große Kacheln statt Tabellen
- **Orientierung:** Primär Hochformat (wie Tablet natürlich gehalten wird)

**Single-Page Application Strategie:**
- Keine Page-Reloads = keine Ladezeiten = keine Unterbrechung des Flows
- Instant Transitions zwischen Ausleihen/Zurückgeben/Übersicht
- Lokales State Management für flüssige Interaktionen
- Lazy Loading für Admin-Bereich (Helfer laden nie Admin-Code)

**Desktop-Support als Sekundärziel:**
- Admin-Bereich funktioniert am Laptop (Materialwart pflegt zuhause)
- Responsive Layout nutzt Desktop-Platz für Übersichtstabellen
- Keine separaten Desktop-Features – ein Codebase für alle

### Effortless Interactions

**Was muss komplett mühelos sein?**

**1. Gerät identifizieren**
- Geräteliste visuell scanbar: Große Rufnamen, Farbcodierung, klare Hierarchie
- Verfügbare Geräte stehen oben, graue (ausgeliehen/defekt) unten
- Suche/Filter nur wenn > 20 Geräte (MVP: nicht nötig)

**2. Name eingeben**
- Autocomplete aktiviert sich automatisch beim Tippen
- Vorschläge erscheinen nach 2 Zeichen
- Tap auf Vorschlag = fertig, kein "OK" nötig
- Weiter tippen überschreibt Vorschlag (kein Löschen nötig)

**3. Bestätigen**
- Ein großer Button: "Ausleihen bestätigen"
- Visuelles Feedback: Grün, Häkchen, Name + Gerät angezeigt
- Dann automatisch zurück zur Übersicht (kein "Weiter" nötig)

**4. Eigenes Gerät finden (Rückgabe)**
- Persönliche Ansicht: "Deine Geräte" (gefiltert nach eingegebenem Namen)
- Maximum 1-2 Geräte pro Person = kein Scrollen
- Ein Tap = zurückgegeben (optionale Notiz überspringbar)

**5. Überblick erfassen**
- Liste: Eine Zeile pro Gerät, klare Spalten (Gerät | Person | Zeit)
- Farbcodierung Grün/Orange/Rot sofort erkennbar
- Pull-to-Refresh für mobile Pattern-Vertrautheit

### Critical Success Moments

**Aha-Moment 1: "Das war's schon?"**

*Wann:* Nach der ersten Ausleihe – Helfer sieht Bestätigungsscreen mit seinem Namen
*Gefühl:* Überraschung, dass es SO einfach war. Positiver Schock.
*Design-Trigger:* Großer grüner Bestätigungsscreen, Häkchen-Animation, klarer Text: "Florian 4-23 ausgeliehen an Tim S."

**Aha-Moment 2: "Endlich weiß ich, wo die Geräte sind"**

*Wann:* FüKw-Personal schaut erste Mal auf die Live-Übersicht während eines Einsatzes
*Gefühl:* Erleichterung, Kontrolle, Überblick statt Chaos
*Design-Trigger:* Klare Tabelle, alle Daten aktuell, sofort scannbar, Suche funktioniert instant

**Aha-Moment 3: "Der Max hat's – ich frag ihn direkt"**

*Wann:* Einsatzleiter fragt "Wer hat Gerät X?", Antwort in 5 Sekunden statt 20 Minuten Rumtelefonieren
*Gefühl:* Produktivitätsgewinn, Zeitersparnis, Professionalität
*Design-Trigger:* Schnelle Suche/Filter, klare Hervorhebung des gesuchten Geräts, Name groß und lesbar

**Aha-Moment 4: "Alles ist zurück – ich hab's schwarz auf weiß"**

*Wann:* Am Ende des Einsatzes: Dashboard zeigt "0 ausgeliehen"
*Gefühl:* Sicherheit, Abgeschlossenheit, dokumentierte Verantwortung
*Design-Trigger:* Dashboard mit klaren Zahlen, optionale Historie-Ansicht "Alle Geräte zurückgegeben heute 23:45"

### Experience Principles

**1. Geschwindigkeit schlägt Features**

Jede Design-Entscheidung wird danach bewertet: "Macht das die Ausleihe schneller oder langsamer?" Features, die Zeit kosten (Validierungen, Bestätigungsdialoge, Zusatzfelder), werden gnadenlos gestrichen. Ein schnelles, reduziertes System ist besser als ein langsames, vollständiges.

*Beispiel:* Keine "Sind Sie sicher?"-Dialoge bei Ausleihe. Stattdessen: Einfaches Undo durch sofortiges Zurückgeben.

**2. Sichtbar ist besser als versteckt**

Im Einsatzstress hat niemand Zeit, durch Menüs zu klicken oder versteckte Funktionen zu suchen. Alle wichtigen Funktionen (Ausleihen, Zurückgeben, Übersicht) müssen immer sichtbar und mit einem Tap erreichbar sein. Keine Hamburger-Menüs, keine Subnavigation, keine versteckten Tabs.

*Beispiel:* Hauptnavigation mit 3 großen Buttons: "Ausleihen" | "Zurückgeben" | "Übersicht" – immer präsent.

**3. Fehler vermeiden statt behandeln**

Statt komplizierte Fehlermeldungen zu designen, verhindere Fehler durch Interface-Design. Geräte, die nicht ausleihbar sind (defekt, schon ausgeliehen), sind ausgegraut und nicht klickbar. Buttons sind disabled, wenn Pflichtfelder fehlen. Nutzer können gar nicht in Fehlerzustände geraten.

*Beispiel:* "Bestätigen"-Button bleibt grau, bis Name eingegeben ist. Kein Fehler-Dialog "Bitte Name eingeben" nötig.

**4. Sofortiges Feedback für jede Aktion**

In einer Touch-Umgebung ist visuelles Feedback kritisch: "Hat das System meinen Tap registriert?" Jede Interaktion gibt innerhalb von 100ms visuelles Feedback (Button wird dunkel, Ripple-Effekt, Häkchen erscheint). Bei längeren Operationen (API-Calls) zeigen Loading-Indikatoren Fortschritt.

*Beispiel:* Tap auf "Bestätigen" → Button wird sofort grün + Loading-Spinner → Nach API-Response: Häkchen + Bestätigungstext

**5. Konsistenz vor Kreativität**

Das Interface nutzt bekannte, etablierte Patterns (Touch-Gesten, Farbcodierungen, Icons), statt kreative neue Interaktionen zu erfinden. Nutzer bringen Erwartungen mit ("Grün = OK, Rot = Problem", "Pull-to-Refresh", "Tap = Auswahl") – das System erfüllt diese, statt sie zu brechen.

*Beispiel:* Farbcodierung folgt Universal-Standard: Grün (verfügbar), Orange (ausgeliehen), Rot (defekt). Keine "kreativen" Farben wie Lila für verfügbar.

---

## Desired Emotional Response

### Primary Emotional Goals

Nutzer sollen bei der Verwendung von **radio-inventar** primär folgende Emotionen erleben:

**Effizienz und Leichtigkeit**
Das System vermittelt das Gefühl von müheloser Produktivität. Nutzer empfinden die Dokumentation nicht als bürokratische Last, sondern als natürlichen, fast automatischen Vorgang. Die App fühlt sich schneller an als der Gedanke "Ich könnte es auch weglassen".

**Kontrolle und Überblick**
FüKw-Personal und Admins spüren jederzeit, dass sie die Situation im Griff haben. Die Frage "Wer hat welches Gerät?" wird in Sekunden beantwortet statt in panischen Telefonaten. Das Gefühl von Chaos weicht strukturierter Klarheit.

**Vertrauen und Verlässlichkeit**
Das System fühlt sich stabil und berechenbar an. Jede Aktion hat eine klare Konsequenz. Im stressigen Einsatz gibt es keine Überraschungen – die App macht genau das, was erwartet wird, jedes Mal.

**Respekt für die Einsatzsituation**
Die App kommuniziert Verständnis für den Kontext: Stress, Handschuhe, schlechte Lichtverhältnisse, keine Zeit. Sie passt sich der Realität der Nutzer an statt umgekehrt. Nutzer fühlen sich ernst genommen, nicht bevormundet.

### Emotional Journey Mapping

**Erster Kontakt (Neugier → Skepsis → Überraschung)**

Helfer Tim steht das erste Mal vor dem Tablet am FüKw. Erwartung: "Noch so ein kompliziertes System, das niemand nutzt." Er tippt vorsichtig auf "Ausleihen", erwartet Formulare, Login-Masken, Dropdown-Wirrwarr. Stattdessen: Geräteliste. Klick. Namenseingabe. Fertig.

Emotion: "Wait... das war's schon? Wirklich?" Ein Moment der positiven Überraschung – das System hat weniger verlangt als erwartet.

**Während der Nutzung (Flow → Sicherheit)**

Sandra im FüKw, Einsatzmodus, 22:30 Uhr. Ein Helfer nach dem anderen braucht Funk. Die App wird zum unsichtbaren Partner: Gerät wählen, Name eintippen, nächster. Kein Nachdenken nötig. Die Interaktion wird zum Rhythmus, nicht zur Unterbrechung ihrer Arbeit.

Emotion: Ruhige Sicherheit. "Ich habe den Überblick. Ich weiß, wo jedes Gerät ist."

**Nach Abschluss (Erleichterung → Stolz)**

Ende der Übung. Klaus checkt als Admin die Historie. Alle Geräte zurück, Zustandsnotizen erfasst, keine Lücken. Früher hätte er jetzt eine unleserliche Papierliste mit 3 fehlenden Einträgen.

Emotion: Erleichterung ("Das ist endlich mal durchgezogen worden") gemischt mit leisem Stolz ("Wir haben das im Griff").

**Bei Problemen (Frustration → Verständnis)**

Seltener Fall: Netzwerkproblem. Die App lädt nicht. Statt einer kryptischen Fehlermeldung: "Netzwerkverbindung unterbrochen. Bitte versuche es in wenigen Sekunden erneut." Klar, ehrlich, handlungsorientiert.

Emotion: Kurze Frustration, aber keine Hilflosigkeit. Die App sagt, was los ist und was zu tun ist.

### Micro-Emotions

**Vertrauen vs. Skepsis**
- Vertrauen entsteht durch: Konsistente Rückmeldung (jeder Klick = sichtbare Reaktion), keine versteckten Features
- Skepsis wird vermieden durch: Transparenz (was passiert jetzt?), kein "magisches" Verhalten

**Sicherheit vs. Unsicherheit**
- Sicherheit durch: Undo-Möglichkeit bei Fehlbuchungen, klare Bestätigungsdialoge bei kritischen Aktionen
- Unsicherheit vermeiden: Keine mehrdeutigen Button-Labels, keine versteckten Zustände

**Kompetenz vs. Überforderung**
- Kompetenzgefühl durch: Schnelle Erfolgserlebnisse (erste Ausleihe in Sekunden), visuelles Feedback
- Überforderung vermeiden: Nur eine Hauptaktion pro Screen, keine parallelen Entscheidungen

**Autonomie vs. Bevormundung**
- Autonomie durch: Freitext-Eingabe (kein Zwang zu "korrekten" Namen), optionale Felder
- Bevormundung vermeiden: Keine unnötigen Validierungen, keine Pflichtfelder außer dem Minimum

### Emotional Design Principles

**1. Prinzip der mühelosen Erfüllung**
Jede Interaktion fühlt sich an wie der Weg des geringsten Widerstands. Die App antizipiert, was der Nutzer will, und bietet den direktesten Weg dorthin. Kein Umweg, kein "erst noch das, dann das".

Konkret: Ausleihen-Button ist das erste, was Tim sieht. Nicht "Login", nicht "Willkommen bei...", sondern die Handlung selbst.

**2. Prinzip der stillen Kompetenz**
Das System zeigt Können, ohne damit zu prahlen. Es ist leistungsstark (Historie, Reporting, Export), versteckt Komplexität aber vor denen, die sie nicht brauchen. Helfer sehen nur, was sie brauchen. Admins finden erweiterte Features, wenn sie danach suchen.

**3. Prinzip der ehrlichen Kommunikation**
Die App lügt nie. Keine falschen Versprechungen, keine beschönigten Fehlermeldungen. Wenn etwas nicht geht, sagt sie warum. Wenn etwas dauert, zeigt sie es. Keine "wird geladen"-Ewigkeiten ohne Status.

**4. Prinzip der respektvollen Anpassung**
Die App respektiert, dass Nutzer unter Stress stehen, Handschuhe tragen, im Dunkeln agieren. Sie passt sich an statt zu fordern. Große Buttons, hoher Kontrast, Dark Mode, keine Feinmotorik-Anforderungen.

---

## User Journey Design

### Journey 1: Schnelle Selbstbedienung (Helfer)

**Persona:** Tim Schäfer, 28, ehrenamtlicher Helfer beim DRK, 3 Jahre Erfahrung

**Kontext:** Samstag 8:45 Uhr, Großübung beginnt in 15 Minuten, 20 Helfer warten am FüKw

**Emotionaler Ausgangszustand:** Leicht gestresst, skeptisch gegenüber neuem System

| Touchpoint | Aktion | Emotion | Design-Anforderung |
|------------|--------|---------|-------------------|
| Erste Begegnung | Sieht Tablet am Schrank | Unsicherheit | Großer CTA "Gerät ausleihen", keine Login-Maske |
| Entscheidung | Sieht andere nutzen | Neugier | Selbsterklärend, kein Tutorial nötig |
| Gerätewahl | Tippt auf "Florian 4-23" | Klarheit | Farbcodierung, große Touch-Targets |
| Namenseingabe | Tippt "Tim S", Autocomplete | Überraschung | Vorschläge nach 2 Zeichen |
| Bestätigung | Tippt grünen Button | Zufriedenheit | Sofortiges Feedback, Häkchen-Animation |

**Emotionale Kurve:** Skepsis → Neugier → Klarheit → Überraschung → Zufriedenheit

**Kritischer Erfolgsmoment:** 12 Sekunden von Start bis Fertig

### Journey 2: Einsatz-Modus (FüKw-Personal)

**Persona:** Sandra Müller, 35, FüKw-Besatzung

**Kontext:** Echteinsatz, 22:30 Uhr, Unwetter, ständig kommen Helfer

| Touchpoint | Aktion | Emotion | Design-Anforderung |
|------------|--------|---------|-------------------|
| Parallele Aufmerksamkeit | Tablet im Blickfeld | Zeitdruck | Sofort-Überblick ohne Tap |
| Schnelle Ausgabe | 8-Sekunden-Ausleihe | Flow | Speed-optimierter Flow |
| Überblicksabfrage | "Wer hat 4-23?" | Kontrolle | Schnelle Suche, klare Liste |
| Einsatz-Ende | 3 Geräte noch draußen | Erleichterung | Dashboard mit Namen |

**Emotionale Kurve:** Stress → Flow → Kontrolle → Erleichterung

### Journey 3: Verwaltung (Admin)

**Persona:** Klaus Berger, 52, Materialwart

**Kontext:** Sonntagabend, Laptop zuhause, Verwaltungsaufgaben

| Touchpoint | Aktion | Emotion | Design-Anforderung |
|------------|--------|---------|-------------------|
| Login | Öffnet Admin-Bereich | Resignation | Passwort-Manager-kompatibel |
| Gerät hinzufügen | 3 Felder ausfüllen | Überraschung | Minimale Pflichtfelder |
| Historie prüfen | Sucht defektes Gerät | Zufriedenheit | Filter nach Gerät/Zeitraum |
| Dashboard | Prüft Gesamtstatus | Kontrolle | Klare Zahlen, schneller Überblick |

**Emotionale Kurve:** Resignation → Überraschung → Zufriedenheit → Kontrolle

### Cross-Journey Patterns

**Muster 1: Sofortige Klarheit**
Nutzer verstehen innerhalb von 3 Sekunden, was zu tun ist. Kein Tutorial nötig.

**Muster 2: Fehlertoleranz & Reversibilität**
Admins können Fehlbuchungen korrigieren. Kein "Punkt ohne Wiederkehr".

**Muster 3: Respekt für Kontext**
Helfer-Flow = minimal. Admin-Flow = vollständig aber optional.

**Muster 4: Visuelles Feedback als Standard**
Jede Interaktion = sichtbare Reaktion.

**Muster 5: Dark-First Design**
Dark Mode als Default für FüKw-Nutzung nachts.

---

## Design System Foundation

### Design System Choice

Für radio-inventar empfehlen wir **Tailwind CSS + shadcn/ui** als Design System Foundation.

**Technologie-Stack:**
- **Tailwind CSS 3.x** als Utility-First CSS Framework
- **shadcn/ui** als Komponentenbibliothek
- **Radix UI** als zugrundeliegende Primitive (via shadcn/ui)
- **CSS Variables** für Theme-Management

### Rationale for Selection

| Anforderung | Tailwind + shadcn/ui Lösung |
|-------------|----------------------------|
| Entwicklungsgeschwindigkeit | Kopierbare Komponenten, kein npm-Overhead |
| Dark Mode | Native `dark:` Varianten |
| Touch-Optimierung | Präzise Utility-Kontrolle |
| Performance | PurgeCSS, < 50KB Production |
| Lernkurve | Schnell erlernbar, Code einsehbar |

### Implementation Approach

```
/src
  /components
    /ui           # shadcn/ui Komponenten
    /radio        # Projektspezifische Komponenten
  /lib
    utils.ts      # Tailwind Merge & Utilities
  /styles
    globals.css   # Tailwind Directives & CSS Variables
```

### Customization Strategy

**Touch-Target Optimierung:**
```typescript
const buttonVariants = cva(
  "min-h-[44px] min-w-[44px] touch-manipulation",
  {
    variants: {
      size: {
        default: "h-12 px-6 py-3",
        lg: "h-14 px-8 py-4",
        icon: "h-12 w-12",
      }
    }
  }
)
```

---

## Visual Foundation

### Color System

**Status Colors (Funktionale Farbcodierung)**

| Status | Light Mode | Dark Mode | Verwendung |
|--------|------------|-----------|------------|
| Verfügbar | `#22c55e` | `#16a34a` | Gerät ausleihbar |
| Ausgeliehen | `#f59e0b` | `#d97706` | Gerät vergeben |
| Defekt | `#ef4444` | `#dc2626` | Gerät nicht nutzbar |
| Wartung | `#6b7280` | `#9ca3af` | In Bearbeitung |

**Semantic Colors**

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--background` | `#ffffff` | `#0a0a0a` |
| `--surface` | `#f9fafb` | `#171717` |
| `--foreground` | `#0a0a0a` | `#fafafa` |
| `--muted` | `#6b7280` | `#a3a3a3` |
| `--border` | `#e5e7eb` | `#27272a` |
| `--primary` | `#3b82f6` | `#60a5fa` |

### Typography System

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| H1 | 28px | 32px | 28px |
| H2 | 22px | 24px | 20px |
| Body | 16px | 18px | 16px |
| Button | 18px | 20px | 16px |

**Font:** System-Font-Stack (SF Pro, Roboto, Segoe UI)

### Spacing & Layout System

**8px Base Unit:**
- `--space-2`: 8px
- `--space-4`: 16px
- `--space-6`: 24px
- `--space-8`: 32px

**Touch-Target Specifications:**
- Minimum: 44px
- Optimal: 48px
- Handschuh-optimiert: 64px

### Dark Mode Strategy

- **Default:** Dark Mode (FüKw-Nutzung nachts)
- **Toggle:** Prominent platziert im Header
- **Background:** `#0a0a0a` (nicht reines Schwarz)
- **Kontrast:** Alle Texte WCAG AA-konform (4.5:1+)

---

## Component Strategy

### Core Components

| Komponente | Beschreibung | Touch-Target |
|------------|--------------|--------------|
| **DeviceCard** | Funkgerät-Karte mit Status, Rufname, Ausleiher | 88px Höhe |
| **BorrowerInput** | Namenseingabe mit Autocomplete | 56px Höhe |
| **StatusBadge** | Farbcodierter Status-Indikator | - |
| **ActionButton** | Primäre Aktionsschaltfläche | 64x64px |
| **ConfirmationDialog** | Modal für kritische Aktionen | - |
| **DeviceList** | Scrollbare Geräteliste | - |
| **StatsCard** | Dashboard-Statistik | - |
| **HistoryTimeline** | Ausleihe-Historie | - |

### Component Hierarchy (Atomic Design)

```
Atoms
├── Button, Input, Badge, Icon, Typography

Molecules
├── DeviceCard, StatsCard, HistoryEntry

Organisms
├── DeviceList, HistoryTimeline, BorrowerAutocomplete

Templates
├── MainLayout, AdminLayout, ModalLayout

Pages
├── LoanPage, ReturnPage, OverviewPage, AdminPages
```

### Component States

| State | Visuell | Verwendung |
|-------|---------|------------|
| Default | Basis-Styling | Ruhezustand |
| Active/Pressed | Skalierung 98%, dunklere Farbe | Touch-Down |
| Focus | 2px Outline | Keyboard-Navigation |
| Disabled | 40% Opacity | Nicht verfügbar |
| Loading | Spinner | Async-Operation |
| Error | Rote Border + Text | Validierungsfehler |
| Success | Grüne Border + Check | Bestätigung |

---

## UX Patterns

### Navigation Pattern

**Bottom Tab Navigation (Tablet-optimiert)**

```
┌─────────────────────────────┐
│  Header: radio-inventar     │
├─────────────────────────────┤
│  Content Area               │
├─────────────────────────────┤
│ [Ausleihen] [Zurückgeben]   │
│ [Übersicht] [Admin]         │
└─────────────────────────────┘
```

- Bottom Tabs optimal für Daumenzone
- Tab-Wechsel sofortig, kein Laden
- Admin-Tab nur sichtbar wenn eingeloggt

### Selection Patterns

**Single-Select Grid (Geräteauswahl)**
- 2 Spalten (Portrait), 3 Spalten (Landscape)
- DeviceCard als selektierbares Element
- Border-Highlight bei Auswahl

### Input Patterns

**Smart Autocomplete (Helfername)**
- Vorschläge ab 2 Zeichen
- Fuzzy-Match
- Tap auf Vorschlag übernimmt Namen
- Freitext möglich

### Feedback Patterns

| Aktion | Feedback | Timing |
|--------|----------|--------|
| Button-Tap | Background-Color-Change | < 50ms |
| Formular-Submit | Loading-Spinner | < 100ms |
| Ausleihe bestätigt | Erfolgs-Toast + Animation | < 200ms |
| Fehler | Fehler-Toast + Shake | < 200ms |

### Error Handling Patterns

- **Inline-Validierung:** Fehler erscheint unter Eingabefeld
- **Netzwerkfehler:** Zentrale Fehlermeldung mit Retry-Button
- **Konflikt:** "Gerät wurde gerade von X ausgeliehen" + Refresh

### Empty States

| Situation | Icon | Headline | CTA |
|-----------|------|----------|-----|
| Keine Geräte | Radio durchgestrichen | "Keine Geräte vorhanden" | Admin-Bereich |
| Alle ausgeliehen | Info | "Alle Geräte ausgeliehen" | Übersicht |
| Keine Ausleihen | Check-Circle | "Keine ausgeliehenen Geräte" | - |
| Fehler | Alert-Triangle | "Daten nicht ladbar" | Erneut versuchen |

### Confirmation Patterns

- **Low-Risk (Rückgabe):** Keine Bestätigung, direktes Feedback
- **High-Risk (Löschen):** Modal mit Destructive-Button
- **Medium-Risk (Ausleihe):** Zwei-Schritt-Prozess (Select + Confirm)

---

## Responsive Design Strategy

### Breakpoint System

| Breakpoint | Viewport | Zielgerät | Priorität |
|------------|----------|-----------|-----------|
| Mobile | < 768px | Smartphones | Nice-to-have |
| **Tablet** | 768px - 1023px | iPad, Android-Tablets | **Primär** |
| Desktop | 1024px+ | Laptops | Sekundär |

### Tablet Layout (Primary)

```
┌─────────────────────────────────────────────────┐
│  [Logo]  Ausleihen           [Dark Mode Toggle] │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐               │
│  │  Verfügbar  │  │ Ausgeliehen │               │
│  │     (12)    │  │     (8)     │               │
│  └─────────────┘  └─────────────┘               │
│                                                 │
│  ┌─────────────────────────────────┐            │
│  │  Name eingeben...               │            │
│  └─────────────────────────────────┘            │
│                                                 │
│  ┌─────────────────────────────────┐            │
│  │ ● Florian 4-11    [Ausleihen]  │  88px      │
│  ├─────────────────────────────────┤            │
│  │ ● Florian 4-23    [Ausleihen]  │  88px      │
│  └─────────────────────────────────┘            │
├─────────────────────────────────────────────────┤
│ [Ausleihen] [Zurückgeben] [Übersicht] [Admin]   │
└─────────────────────────────────────────────────┘
```

**Tablet Design-Prinzipien:**
- Kartengröße: Min. 88px Höhe
- Button-Größe: Min. 64x64px
- Schriftgröße: Body 18px, Buttons 20px
- Spacing: 16px zwischen Elementen, 24px zwischen Karten

### Touch vs. Mouse

| Touch (Tablet) | Maus (Desktop) |
|----------------|----------------|
| 64x64px Buttons | 40x40px Buttons |
| Kein Hover-Abhängigkeit | Hover-States |
| Haptisches Feedback | Cursor-Änderungen |
| Swipe-to-Refresh | Click-to-Refresh |

---

## Accessibility Guidelines

### Touch Accessibility

**WCAG 2.1 Level AAA Touch-Targets:**
- Standard-Buttons: **64x64px**
- Primär-Aktionen: **88x88px**
- Spacing: Min. **16px** zwischen Targets

**Handschuh-Kompatibilität:**
- Keine Präzisions-Interaktionen
- Große, deutlich abgegrenzte Buttons
- Undo-Funktion für alle Aktionen

### Visual Accessibility

**Kontrastverhältnisse (WCAG AA):**

| Element | Kontrastverhältnis |
|---------|-------------------|
| Body-Text | Min. 4.5:1 |
| Überschriften | Min. 7:1 |
| Buttons | Min. 4.5:1 |
| Status-Farben | + Icon/Label (nicht nur Farbe) |

**Lesbarkeit:**
- Light Mode für helle Umgebung
- Dark Mode für dunkle Umgebung (Default)
- Hoher Kontrast für Sonnenlicht

### Cognitive Accessibility

- Eine Hauptaktion pro Screen
- Maximal 3 Informationsebenen
- Konsistente Patterns durchgängig
- Sofortiges Feedback für jede Aktion

### WCAG Compliance Level

**Angestrebt: WCAG 2.1 Level AA** mit ausgewählten AAA-Kriterien:
- Touch-Targets: 64x64px (AAA)
- Kontrast Überschriften: 7:1 (AAA)

---

## Performance & Loading

### Performance Targets

| Metrik | Ziel | Messmethode |
|--------|------|-------------|
| Initial Load | < 3 Sekunden | Time to Interactive |
| Interaction | < 500ms | First Input Delay |
| API Response | < 1 Sekunde | Network-Tab |
| Ausleihe-Gesamt | < 30 Sekunden | User-Journey |

### Performance Budget

| Ressource | Budget |
|-----------|--------|
| JavaScript Bundle | < 200 KB (gzipped) |
| CSS | < 50 KB (gzipped) |
| Fonts | < 100 KB (System-Fonts bevorzugt) |
| **Total First Load** | < 400 KB |

### Loading Strategy

**Skeleton Screens für Initial Load:**
```
┌─────────────────────────────┐
│  ┌─────────────────────────┐│
│  │ ████████  ░░░░░░░░░     ││ ← Skeleton DeviceCard
│  │ ████      ░░░░░░        ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**Optimistic UI:**
- Ausleihe sofort im UI reflektieren
- Bei API-Fehler: Rollback + Toast
- Gefühlte Performance < 100ms

### Perceived Performance Tricks

1. **Prefetching:** Rückgabe-Route bei Hover prefetchen
2. **Animationen:** 200ms Erfolgs-Animationen überbrücken Wartezeit
3. **Stale-While-Revalidate:** Gecachte Daten sofort, Update im Hintergrund
4. **Microcopy:** "Wird gespeichert..." statt nur Spinner

---

## Implementation Notes

### Technology Recommendations

| Bereich | Empfehlung |
|---------|------------|
| Framework | React / Next.js (SPA-Modus) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand oder React Query |
| Forms | React Hook Form |
| Icons | Lucide Icons (SVG) |
| Testing | Vitest + Playwright |

### Prioritäten für MVP

1. **P0 (Kritisch):** Ausleihe-Flow, Rückgabe-Flow, Geräteliste
2. **P1 (Wichtig):** Dark Mode, Autocomplete, Live-Übersicht
3. **P2 (Nice-to-have):** Admin-Dashboard, Historie, CSV-Export

### Erfolgskriterien

- [ ] Ausleihe in unter 30 Sekunden möglich
- [ ] Touch-Targets min. 44x44px (ideal 64x64px)
- [ ] Lighthouse Accessibility Score ≥ 95
- [ ] Initial Load < 3 Sekunden
- [ ] Nutzbar mit Arbeitshandschuhen (manueller Test)
- [ ] Dark Mode verfügbar und getestet

---

*Dieses Dokument wurde am 2025-12-14 erstellt und dient als Referenz für die UX-Implementierung von radio-inventar.*
