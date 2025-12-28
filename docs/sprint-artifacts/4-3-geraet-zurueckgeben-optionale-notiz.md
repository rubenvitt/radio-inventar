# Story 4.3: Gerät zurückgeben (optionale Notiz)

Status: done

## Story

As a **Helfer (Freiwilliger im Einsatz)**,
I want **ein Gerät mit einem Klick zurückgeben und optional eine Zustandsnotiz hinterlassen**,
so that **ich Probleme wie "Akku schwach" oder "Mikrofon defekt" melden kann**.

**Covers:** FR7 (optionale Zustandsnotiz), FR8 (Rückgabe mit einem Klick)

## Acceptance Criteria

1. **AC#1: Rückgabe-Dialog öffnet sich bei Geräte-Tap**
   ```gherkin
   Given ich sehe meine ausgeliehenen Geräte (gefiltert nach meinem Namen)
   When ich auf ein Gerät tippe
   Then öffnet sich ein Rückgabe-Dialog mit dem Gerätenamen als Titel
   ```

2. **AC#2: Optionales Notizfeld im Dialog**
   ```gherkin
   Given der Rückgabe-Dialog ist geöffnet
   Then sehe ich ein optionales Textfeld für Zustandsnotizen
   And das Feld zeigt einen Platzhalter "z.B. Akku schwach, Kratzer am Gehäuse..."
   And das Feld erlaubt maximal 500 Zeichen
   And ich sehe einen Zeichenzähler (z.B. "0 / 500")
   ```

3. **AC#3: Direkte Rückgabe ohne Notiz**
   ```gherkin
   Given der Rückgabe-Dialog ist geöffnet
   When ich direkt auf "Zurückgeben" tippe (ohne Notiz)
   Then wird das Gerät zurückgegeben (PATCH /api/loans/:id ohne Body)
   And die Rückgabe erfolgt mit returnNote = null
   ```

4. **AC#4: Rückgabe mit Notiz**
   ```gherkin
   Given der Rückgabe-Dialog ist geöffnet
   When ich eine Notiz eingebe (z.B. "Akku schwach")
   And ich auf "Zurückgeben" tippe
   Then wird das Gerät mit der Notiz zurückgegeben (PATCH /api/loans/:id mit { returnNote })
   ```

5. **AC#5: Erfolgsbestätigung**
   ```gherkin
   Given ich habe ein Gerät erfolgreich zurückgegeben
   Then erscheint eine Bestätigung: "[Rufname] [ID] zurückgegeben" (z.B. "Florian 4-23 zurückgegeben")
   And der Dialog schließt sich automatisch
   And das Gerät verschwindet aus meiner Liste (optimistic UI)
   ```

6. **AC#6: Fehlerbehandlung**
   ```gherkin
   Given ich versuche ein Gerät zurückzugeben
   When ein API-Fehler auftritt (404, 409, 500)
   Then erscheint ein Toast mit der Fehlermeldung
   And der Dialog bleibt geöffnet (keine Daten verloren)
   And der "Zurückgeben"-Button wird wieder aktiviert
   ```

7. **AC#7: Dialog abbrechen**
   ```gherkin
   Given der Rückgabe-Dialog ist geöffnet
   When ich auf "Abbrechen" tippe oder Escape drücke oder außerhalb klicke
   Then schließt sich der Dialog
   And keine Rückgabe wird durchgeführt
   ```

8. **AC#8: Touch-Optimierung**
   ```gherkin
   Given ich bin auf einem Tablet/Touchgerät
   Then haben alle Buttons mindestens 44x44px Größe
   And die Karten in der Liste haben mindestens 56px Höhe
   And es gibt genug Abstand zwischen interaktiven Elementen
   ```

## Tasks / Subtasks

### Task 1: ReturnDialog Komponente erstellen (AC: #1, #2, #7)
- [x] `components/features/ReturnDialog.tsx` erstellen
- [x] shadcn/ui Dialog als Basis verwenden (Focus-Trap automatisch enthalten)
- [x] Props: `open`, `onOpenChange`, `loan`, `onConfirm`
- [x] Dialog-Titel: Gerät-Rufname + ID anzeigen
- [x] Textarea für optionale Notiz (max `LOAN_FIELD_LIMITS.RETURN_NOTE_MAX` Zeichen)
- [x] Zeichenzähler implementieren (live aktualisierend)
- [x] "Abbrechen" und "Zurückgeben" Buttons
- [x] Escape-Taste und Außenklick zum Schließen
- [x] memo() wrapper für Performance

### Task 2: useReturnDevice Mutation Hook (AC: #3, #4, #5, #6)
- [x] In `api/loans.ts` Hook `useReturnDevice()` hinzufügen
- [x] PATCH `/api/loans/:loanId` mit optionalem `{ returnNote }`
- [x] Response direkt verwenden (Backend ist trusted, keine Schema-Validierung nötig)
- [x] Optimistic Update: Loan sofort aus Cache entfernen
- [x] Rollback bei Fehler: Loan zurück in Cache
- [x] Query Invalidation: `loanKeys.active()` und `deviceKeys.all()`
- [x] Fehler-Mapping mit `getErrorMessage()` aus `lib/error-messages.ts`

### Task 3: LoanedDeviceCard erweitern (AC: #1, #8)
- [x] `onClick` Prop zu LoanedDeviceCard hinzufügen
- [x] Cursor-Pointer und Hover-Effekt
- [x] Touch-Feedback (active:scale-[0.98] o.ä.)
- [x] Minimum 56px Höhe beibehalten
- [x] ARIA: role="button" und aria-label

### Task 4: Return Page Integration (AC: #1-#8)
- [x] State für ausgewählten Loan (Dialog-Trigger)
- [x] ReturnDialog in return.tsx einbinden
- [x] Erfolgs-Toast nach Rückgabe anzeigen (sonner)
- [x] Fehler-Toast bei API-Fehlern (sonner)
- [x] Loading-State während Mutation (Button disabled)

### Task 5: Tests schreiben
- [x] `ReturnDialog.spec.tsx` - Komponententests (34 Tests)
  - [x] Dialog öffnet/schließt korrekt
  - [x] Notizfeld-Validierung (max 500 Zeichen)
  - [x] Zeichenzähler funktioniert
  - [x] Callbacks werden aufgerufen
  - [x] Escape/Außenklick schließt Dialog
  - [x] XSS-Schutz für Eingaben
- [x] `loans.spec.tsx` - useReturnDevice Hook-Tests (4 Tests)
  - [x] Erfolgreiche Mutation
  - [x] Optimistic Update funktioniert
  - [x] Rollback bei Fehler
- [x] `LoanedDeviceCard.spec.tsx` - Erweiterte Tests (14 neue Tests)
  - [x] Click Interaction (Story 4.3)
  - [x] Keyboard Support (Enter, Space)
  - [x] ARIA Accessibility (role, aria-label)

## Dev Notes

### Vorhandene Infrastruktur (Stories 4.1 + 4.2)

**Backend API (Story 4.1 - bereits implementiert):**
```
PATCH /api/loans/:loanId
Body: { returnNote?: string } (optional, max LOAN_FIELD_LIMITS.RETURN_NOTE_MAX Zeichen)
Response: { data: { id, deviceId, borrowerName, borrowedAt, returnedAt, returnNote, device: { id, callSign, status } } }
```
Fehler-Codes: siehe `lib/error-messages.ts` (400, 404, 409, 500)

**Frontend Komponenten (Story 4.2 - bereits implementiert):**
- `LoanedDeviceCard` - Zeigt einzelne Ausleihe an (56px min-height)
- `LoanedDeviceList` - Liste mit Loading/Error/Empty States
- `useMyLoans(borrowerName)` - Filtert aktive Ausleihen client-seitig
- `formatDate()` - de-DE Datumsformatierung
- `sanitizeForDisplay()` - XSS-Schutz

### Implementierungs-Patterns (aus 4.1 + 4.2 übernehmen)

**TypeScript Interfaces:**
```typescript
interface ReturnDialogProps {
  loan: ActiveLoan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
}

interface ReturnDevicePayload {
  loanId: string;
  returnNote?: string | null;
}

interface ReturnDeviceContext {
  previousLoans: ActiveLoan[] | undefined;
}
```

**Optimistic Update Pattern:**
```typescript
useMutation<ReturnedLoan, Error, ReturnDevicePayload, ReturnDeviceContext>({
  mutationFn: returnDevice,
  onMutate: async ({ loanId }) => {
    await queryClient.cancelQueries({ queryKey: loanKeys.active() });
    const previous = queryClient.getQueryData<ActiveLoan[]>(loanKeys.active());
    queryClient.setQueryData(loanKeys.active(), old => old?.filter(l => l.id !== loanId));
    return { previousLoans: previous };
  },
  onError: (_err, _vars, ctx) => queryClient.setQueryData(loanKeys.active(), ctx?.previousLoans),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: loanKeys.active() });
    queryClient.invalidateQueries({ queryKey: deviceKeys.all() });
  },
});
```

**Fehler-Mapping (aus lib/error-messages.ts):**
```typescript
import { getErrorMessage } from '@/lib/error-messages';
// Verwendung: toast.error(getErrorMessage(error.status));
```

**Dialog-Pattern (shadcn/ui):**
```tsx
<Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{selectedLoan?.device.callSign} zurückgeben</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Abbrechen</Button>
      <Button onClick={handleReturn} disabled={isPending}>
        {isPending ? 'Wird zurückgegeben...' : 'Zurückgeben'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Kritische Regeln (MUST FOLLOW)

1. **Konstanten aus Shared importieren:**
   ```typescript
   import { LOAN_FIELD_LIMITS } from '@radio-inventar/shared';
   const MAX_NOTE_LENGTH = LOAN_FIELD_LIMITS.RETURN_NOTE_MAX; // 500
   ```

2. **Toast-Library: sonner (bereits in shadcn/ui):**
   ```typescript
   import { toast } from 'sonner';
   toast.success(`${loan.device.callSign} zurückgegeben`);
   toast.error(getErrorMessage(error.status));
   ```

3. **Query Key Factory verwenden:**
   ```typescript
   import { loanKeys, deviceKeys } from '@/lib/queryKeys';
   ```

4. **Zeichenzähler implementieren:**
   ```typescript
   const [note, setNote] = useState('');
   <Textarea
     value={note}
     onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
     maxLength={MAX_NOTE_LENGTH}
   />
   <span className="text-sm text-muted-foreground">
     {note.length} / {MAX_NOTE_LENGTH}
   </span>
   ```

5. **memo() für alle Feature-Komponenten:**
   ```typescript
   export const ReturnDialog = memo(function ReturnDialog(props) { ... });
   ```

6. **sanitizeForDisplay() für alle User-Eingaben:**
   ```typescript
   <DialogTitle>{sanitizeForDisplay(loan.device.callSign)}</DialogTitle>
   ```

7. **Touch-optimierte Buttons (min 44x44px):**
   ```typescript
   <Button className="min-h-11 min-w-11 px-4">
   ```

### Project Structure Notes

**Neue Dateien:**
```
apps/frontend/src/
├── components/features/
│   ├── ReturnDialog.tsx          # NEU
│   └── ReturnDialog.spec.tsx     # NEU
└── api/
    └── loans.ts                  # ERWEITERN: useReturnDevice()
```

**Zu modifizierende Dateien:**
```
apps/frontend/src/
├── routes/return.tsx             # Dialog-Integration
└── components/features/
    └── LoanedDeviceCard.tsx      # onClick Prop hinzufügen
```

### References

- [Source: docs/epics.md#Epic-4-Story-4.3] - User Story + Acceptance Criteria
- [Source: docs/architecture.md#API-Patterns] - PATCH /api/loans/:id Spezifikation
- [Source: docs/architecture.md#Frontend-State] - TanStack Query Patterns
- [Source: docs/sprint-artifacts/4-1-backend-api-rueckgabe.md] - API Implementation Details
- [Source: docs/sprint-artifacts/4-2-eigene-ausgeliehene-geraete-anzeigen.md] - Frontend Patterns
- [Source: apps/frontend/src/components/features/LoanedDeviceCard.tsx] - Basis-Komponente
- [Source: apps/frontend/src/api/loans.ts] - Bestehende Hooks

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Story 4.3 ist die letzte Story in Epic 4 (Geräterückgabe)
- Backend API ist vollständig implementiert (Story 4.1 - 141 Unit Tests + 48 E2E Tests)
- Frontend-Basis existiert bereits (Story 4.2 - LoanedDeviceCard, useMyLoans)
- ReturnDialog mit shadcn/ui Dialog, Textarea und Sonner implementiert
- Optimistic UI Pattern aus Epic 3.4 erfolgreich übernommen
- Alle 8 Acceptance Criteria erfüllt
- 52 neue Tests geschrieben (34 ReturnDialog + 14 LoanedDeviceCard + 4 useReturnDevice)
- Parallele Entwicklung mit Subagents für Tasks 1-3 und Tests

### Implementation Session (2025-12-19)

**Implementierung:**
1. shadcn/ui Komponenten installiert: dialog, textarea, sonner
2. Sonner.tsx angepasst für custom ThemeProvider (nicht next-themes)
3. Toaster in __root.tsx hinzugefügt
4. ReturnDialog Komponente mit allen ACs erstellt
5. useReturnDevice Hook mit Optimistic Update implementiert
6. LoanedDeviceCard mit onClick, Keyboard und ARIA erweitert
7. LoanedDeviceList mit onLoanClick erweitert
8. return.tsx vollständig integriert mit Dialog, Mutation und Toasts
9. Alle TypeScript exactOptionalPropertyTypes Errors behoben

**Test-Ergebnisse:**
- ReturnDialog.spec.tsx: 34/34 Tests ✓
- LoanedDeviceCard.spec.tsx: 28/28 Tests ✓
- loans.spec.tsx: 15/15 Tests ✓
- LoanedDeviceList.spec.tsx: 16/16 Tests ✓

### File List

**Erstellt:**
- apps/frontend/src/components/features/ReturnDialog.tsx
- apps/frontend/src/components/features/ReturnDialog.spec.tsx

**Erweitert:**
- apps/frontend/src/api/loans.ts (useReturnDevice Hook + returnDevice)
- apps/frontend/src/api/loans.spec.tsx (4 neue useReturnDevice Tests)
- apps/frontend/src/routes/return.tsx (Dialog Integration, Toasts)
- apps/frontend/src/routes/__root.tsx (Toaster hinzugefügt)
- apps/frontend/src/components/features/LoanedDeviceCard.tsx (onClick, Keyboard, ARIA)
- apps/frontend/src/components/features/LoanedDeviceCard.spec.tsx (14 neue Tests)
- apps/frontend/src/components/features/LoanedDeviceList.tsx (onLoanClick Prop)
- apps/frontend/src/components/features/ErrorState.tsx (onRetry optional)
- apps/frontend/src/components/ui/sonner.tsx (custom ThemeProvider)
- apps/frontend/src/components/ui/dialog.tsx (shadcn/ui)
- apps/frontend/src/components/ui/textarea.tsx (shadcn/ui)
- apps/frontend/src/components/features/DialogErrorFallback.tsx (als Dialog wrapped)

### Code Review Session (2025-12-19)

**Reviewer:** Claude Opus 4.5 (Adversarial Code Review mit Subagents)

**Issues gefunden:** 5 HIGH, 6 MEDIUM, 5 LOW
**Issues behoben:** 5 HIGH, 5 MEDIUM, 1 LOW

**Fixes angewendet:**
1. **H1:** Query Invalidation korrigiert (`deviceKeys.all` → `deviceKeys.lists()`) - loans.ts:268
2. **H2:** Focus-visible Styles für Keyboard-Navigation hinzugefügt - LoanedDeviceCard.tsx:49
3. **H3:** State Bug behoben (Note persists across loans) - ReturnDialog.tsx (useEffect)
4. **H4:** Race Condition bei Success Toast behoben - return.tsx (deviceName vor mutate() capturen)
5. **H5:** XSS Vulnerability behoben (returnNote sanitized) - ReturnDialog.tsx
6. **M2:** Redundante Sanitization von formatDate() entfernt - LoanedDeviceCard.tsx:63
7. **M3:** Rollback-Feedback hinzugefügt - return.tsx (toast.info)
8. **M4:** DialogErrorFallback als echten Dialog gewrapped - DialogErrorFallback.tsx
9. **M6:** Defensive Validation hinzugefügt - ReturnDialog.tsx
10. **L3:** aria-label auf Textarea hinzugefügt - ReturnDialog.tsx

**Tests nach Fixes:** 79/79 bestanden ✓
