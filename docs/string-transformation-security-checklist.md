# String-Transformation Security Checklist

Diese Checklist dokumentiert kritische Sicherheitsanforderungen für String-Transformationen im radio-inventar Projekt, basierend auf den Learnings aus Epic 4.

## 1. DOS-Vector Prevention

### Längenchecks
- [ ] Längenchecks werden **VOR** `normalize()` durchgeführt
- [ ] Maximale Länge wird klar definiert (z.B. `MAX_BORROWER_NAME_LENGTH`)
- [ ] Input wird sofort rejected, wenn Länge überschritten wird
- [ ] Keine String-Operationen an zu langen Inputs durchführen

### Buffer-Dimensionierung
- [ ] Buffer mit `Math.min()` definiert statt direkter Input-Länge
- [ ] Buffer-Größe: `Math.min(input.length, maxLength + 100)`
- [ ] Maximale Buffer-Größe ist hart limitiert (z.B. 200 Zeichen)
- [ ] Kein unbegrenztes Wachstum möglich

### DOS-Testing
- [ ] Test für +1KB Payloads vorhanden
- [ ] Test für Mega-Strings (>100KB) vorhanden
- [ ] Test verifiziert, dass oversized Inputs rejected werden
- [ ] Performance-Test für maximal erlaubte Größe

## 2. Unicode Security

### NFC-Normalisierung
- [ ] Dokumentiert: NFC kann Länge ändern (z.B. é → é)
- [ ] Längencheck erfolgt NACH Normalisierung für Business Logic
- [ ] Längenchecks für DOS-Prevention erfolgen VOR Normalisierung
- [ ] Tests für Längenänderung durch Normalisierung vorhanden

### Homograph-Attacken
- [ ] Dokumentiert: Ähnlich aussehende Zeichen aus verschiedenen Schriftsystemen
- [ ] Beispiel: lateinisches 'a' vs. kyrillisches 'а' (U+0061 vs. U+0430)
- [ ] Bei kritischen Namen: Warnung oder Prüfung auf gemischte Scripts
- [ ] Keine automatische Konvertierung ohne User-Feedback

### Zero-Width Characters
- [ ] Zero-Width Space (U+200B) wird gefiltert
- [ ] Zero-Width Non-Joiner (U+200C) wird gefiltert
- [ ] Zero-Width Joiner (U+200D) wird gefiltert
- [ ] Andere unsichtbare Zeichen werden dokumentiert und behandelt
- [ ] Tests für Zero-Width Characters vorhanden

## 3. Validation Order

### Strikte Reihenfolge
- [ ] **1. Schritt:** Längenchecks (DOS-Prevention)
- [ ] **2. Schritt:** Sanitization (gefährliche Zeichen entfernen)
- [ ] **3. Schritt:** Normalisierung (NFC für Konsistenz)
- [ ] **4. Schritt:** Business Logic Validation

### DOS-Prevention First
- [ ] Längencheck ist die **erste** Operation
- [ ] Bei Überschreitung: sofortiger Reject, keine weiteren Operationen
- [ ] Buffer-Größe basiert auf Input-Länge mit hartem Limit

### Sanitization Before Normalization
- [ ] Gefährliche/unsichtbare Zeichen werden vor Normalisierung entfernt
- [ ] Zero-Width Characters werden früh gefiltert
- [ ] Kontrollzeichen werden früh gefiltert

### Business Logic Last
- [ ] Business-Validierung (z.B. Mindestlänge) erfolgt zuletzt
- [ ] Validierung arbeitet mit sauberem, normalisiertem String
- [ ] Fehlermeldungen basieren auf finaler String-Form

## 4. Test-Anforderungen

### Edge Cases für max-length Strings
- [ ] Test für exakt `maxLength` Zeichen
- [ ] Test für `maxLength + 1` Zeichen (sollte rejected werden)
- [ ] Test für String der nach Normalisierung zu lang wird
- [ ] Test für String der nach Sanitization unter Mindestlänge fällt

### Unicode-Normalisierungs-Tests
- [ ] Test für composed characters (z.B. 'é' U+00E9)
- [ ] Test für decomposed characters (z.B. 'e' + '´' U+0065 U+0301)
- [ ] Test verifiziert: beide Formen werden zu identischem String
- [ ] Test für Längenänderung durch Normalisierung

### Rejection-Tests für oversized Input
- [ ] Test für 1KB Input (sollte rejected werden)
- [ ] Test für 10KB Input (sollte rejected werden)
- [ ] Test für 100KB Input (sollte rejected werden)
- [ ] Test verifiziert korrekten HTTP-Status (400 Bad Request)
- [ ] Test verifiziert aussagekräftige Error Message

### Zero-Width Character Tests
- [ ] Test für Zero-Width Space in der Mitte
- [ ] Test für Zero-Width Space am Anfang/Ende
- [ ] Test für multiple Zero-Width Characters
- [ ] Test verifiziert: Zero-Width Characters werden entfernt

### Homograph-Tests (Optional)
- [ ] Test für gemischte Scripts dokumentiert
- [ ] Beispiel-Payload mit kyrillischen Lookalikes vorhanden
- [ ] Behavior bei gemischten Scripts definiert

## 5. Implementation-Patterns

### Empfohlene Funktion für String-Sanitization

```typescript
function sanitizeAndNormalize(
  input: string,
  maxLength: number
): string {
  // 1. DOS-Prevention: Längencheck FIRST
  if (input.length > maxLength * 2) {
    throw new Error(`Input too long: ${input.length} chars`);
  }

  // 2. Sanitization: gefährliche Zeichen entfernen
  const sanitized = input
    .replace(/[\u200B\u200C\u200D]/g, '') // Zero-Width
    .replace(/[\x00-\x1F\x7F]/g, '');     // Control chars

  // 3. Normalisierung: NFC für Konsistenz
  const normalized = sanitized.normalize('NFC');

  // 4. Business Logic: Längencheck für Business Rules
  if (normalized.length > maxLength) {
    throw new Error(`Name too long after normalization`);
  }

  return normalized;
}
```

### Backend Validation Pattern

```typescript
@MaxLength(MAX_BORROWER_NAME_LENGTH * 2) // DOS-Prevention
@Transform(({ value }) => sanitizeAndNormalize(value, MAX_BORROWER_NAME_LENGTH))
@MinLength(1) // Business Logic
name: string;
```

### Frontend Sanitization Pattern

```typescript
// In sanitize.ts
export function sanitizeBorrowerName(input: string): string {
  return sanitizeAndNormalize(input, MAX_BORROWER_NAME_LENGTH);
}

// In Component
const handleChange = (value: string) => {
  const sanitized = sanitizeBorrowerName(value);
  setName(sanitized);
};
```

## 6. Dokumentations-Anforderungen

- [ ] Security-Rationale in Code-Kommentaren erklärt
- [ ] Warum Längencheck vor Normalisierung: DOS-Prevention
- [ ] Warum Buffer mit `Math.min()`: Hard Limit
- [ ] Beispiele für Unicode-Attacks in Tests dokumentiert
- [ ] Link zu dieser Checklist in relevanten Files

## 7. Code Review Checklist

- [ ] Jede String-Transformation folgt der definierten Reihenfolge
- [ ] Keine unbounded `normalize()` oder `toLowerCase()` Calls
- [ ] Buffer-Größen sind mit `Math.min()` limitiert
- [ ] Tests für oversized Inputs vorhanden
- [ ] Tests für Unicode Edge Cases vorhanden
- [ ] Security-Kommentare erklären "Warum", nicht nur "Was"

## Referenzen

- **Epic 4 Learnings:** Validation-Reports in `docs/sprint-artifacts/`
- **Relevante Files:**
  - Backend: `apps/backend/src/modules/borrowers/dto/suggest-borrowers.dto.ts`
  - Frontend: `apps/frontend/src/lib/sanitize.ts`
  - Shared: `packages/shared/src/constants/validation.constants.ts`
- **Unicode Normalization:** [Unicode Standard Annex #15](https://unicode.org/reports/tr15/)
- **Homograph Attacks:** [Unicode Technical Report #36](https://unicode.org/reports/tr36/)

---

**Version:** 1.0
**Erstellt:** 2025-12-19
**Basierend auf:** Epic 4 Security Learnings (radio-inventar)
