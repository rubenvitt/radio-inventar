# Optimistic UI Pattern Template

**Projekt:** Radio-Inventar
**Version:** 1.0
**Datum:** 2025-12-19
**Basierend auf:** Epic 4 Learnings (Stories 3.4, 4.3)

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Core Pattern](#core-pattern)
3. [Code-Beispiel aus dem Projekt](#code-beispiel-aus-dem-projekt)
4. [Implementierungs-Checkliste](#implementierungs-checkliste)
5. [Anti-Patterns](#anti-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Übersicht

Das Optimistic UI Pattern ermöglicht sofortiges visuelles Feedback bei asynchronen Operationen durch:

- **Sofortige UI-Updates** vor Server-Bestätigung
- **Automatischer Rollback** bei Fehlern
- **Cache-Invalidierung** nach Erfolg

### Wann verwenden?

- Mutation-Operationen (Create, Update, Delete)
- Hohe Erfolgswahrscheinlichkeit (> 95%)
- Schnelles User-Feedback erforderlich (< 100ms)

### Wann NICHT verwenden?

- Komplexe Server-Validierung
- Unvorhersehbare Ergebnisse
- Externe Abhängigkeiten (Payment, etc.)

---

## Core Pattern

### Pattern-Struktur

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

// 1. Context Type für Rollback-Daten
interface MutationContext {
  previousData: DataType[] | undefined;
}

// 2. Hook mit Optimistic Update
export function useOptimisticMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReturnType, Error, PayloadType, MutationContext>({
    mutationFn: apiFunction,
    retry: false, // Keine Retries bei Mutations

    // 3. onMutate: UI sofort updaten, Rollback-Daten speichern
    onMutate: async (payload) => {
      // Laufende Queries abbrechen
      await queryClient.cancelQueries({ queryKey: ['data'] });

      // Snapshot für Rollback
      const previousData = queryClient.getQueryData<DataType[]>(['data']);

      // Optimistic Update
      queryClient.setQueryData<DataType[]>(['data'], (old) => {
        // Logik zum Update
        return updatedData;
      });

      return { previousData };
    },

    // 4. onError: Rollback bei Fehler
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['data'], context.previousData);
      }
    },

    // 5. onSettled: Cache-Invalidierung nach Erfolg/Fehler
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['data'] });
      queryClient.invalidateQueries({ queryKey: ['related'] });
    },
  });
}
```

### UI Integration Pattern

```tsx
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';

function Component() {
  const mutation = useOptimisticMutation();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handleConfirm = useCallback((id: string, data: FormData) => {
    // KRITISCH: Werte VOR mutate() capturen (Race Condition Prevention)
    const itemRef = selectedItem;
    if (!itemRef) return;

    // Werte für Success-Toast VORHER capturen
    const displayName = sanitizeForDisplay(itemRef.name);

    mutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          // Verwende PRE-CAPTURED Werte (nicht aus State lesen!)
          toast.success(`${displayName} erfolgreich gespeichert`);
          setSelectedItem(null);
        },
        onError: (error) => {
          // Dialog bleibt offen, User behält Eingaben
          toast.error(getUserFriendlyErrorMessage(error));
          toast.info('Änderung wurde rückgängig gemacht', { duration: 3000 });
        },
      }
    );
  }, [selectedItem, mutation]);

  return (
    <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
      {/* Dialog Content */}
      <Button onClick={() => handleConfirm(selectedItem.id, formData)} disabled={mutation.isPending}>
        {mutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
      </Button>
    </Dialog>
  );
}
```

---

## Code-Beispiel aus dem Projekt

### Beispiel: Geräterückgabe (Story 4.3)

**Use Case:** User gibt ausgeliehenes Gerät zurück, Gerät verschwindet sofort aus Liste.

#### 1. API Hook mit Optimistic Update

```typescript
// apps/frontend/src/api/loans.ts

interface ReturnDevicePayload {
  loanId: string;
  returnNote?: string | null;
}

interface ReturnDeviceContext {
  previousLoans: ActiveLoan[] | undefined;
}

async function returnDevice(payload: ReturnDevicePayload): Promise<void> {
  const body = payload.returnNote ? { returnNote: payload.returnNote } : {};
  const response = await apiClient.patch(`/api/loans/${payload.loanId}`, body);
  // Response-Validierung...
}

export function useReturnDevice() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReturnDevicePayload, ReturnDeviceContext>({
    mutationFn: returnDevice,
    retry: false,

    // Schritt 1: Optimistic Update - Loan sofort entfernen
    onMutate: async ({ loanId }) => {
      // Laufende Queries abbrechen
      await queryClient.cancelQueries({ queryKey: loanKeys.active() });

      // Snapshot für Rollback
      const previousLoans = queryClient.getQueryData<ActiveLoan[]>(loanKeys.active());

      // Optimistic Update: Loan aus Cache entfernen
      queryClient.setQueryData<ActiveLoan[]>(loanKeys.active(), (old) =>
        old?.filter((l) => l.id !== loanId) ?? []
      );

      return { previousLoans };
    },

    // Schritt 2: Rollback bei Fehler
    onError: (_err, _vars, context) => {
      if (context?.previousLoans) {
        queryClient.setQueryData(loanKeys.active(), context.previousLoans);
      }
    },

    // Schritt 3: Cache-Invalidierung nach Erfolg/Fehler
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.active() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
    },
  });
}
```

#### 2. UI Integration mit Race-Condition-Prevention

```tsx
// apps/frontend/src/routes/return.tsx

function ReturnPage() {
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);
  const returnMutation = useReturnDevice();

  const handleReturnConfirm = useCallback((loanId: string, returnNote: string | null) => {
    // FIX: Loan-Referenz capturen (Race Condition Prevention)
    const loanRef = selectedLoan;
    if (!loanRef) return;

    // KRITISCH: Werte VOR async Mutation capturen
    const deviceName = sanitizeForDisplay(loanRef.device.callSign);

    returnMutation.mutate(
      { loanId, returnNote },
      {
        onSuccess: () => {
          // Verwende PRE-CAPTURED deviceName (nicht selectedLoan.device.callSign!)
          toast.success(`${deviceName} zurückgegeben`);
          setSelectedLoan(null);
        },
        onError: (error) => {
          toast.error(getUserFriendlyErrorMessage(error));
          toast.info('Änderung wurde rückgängig gemacht', { duration: 3000 });
          // Dialog bleibt offen - selectedLoan nicht zurücksetzen
        },
      }
    );
  }, [selectedLoan, returnMutation]);

  return (
    <>
      <LoanedDeviceList
        loans={loans}
        onLoanClick={setSelectedLoan}
      />

      {selectedLoan && (
        <ReturnDialog
          loan={selectedLoan}
          open={!!selectedLoan}
          onOpenChange={(open) => !open && setSelectedLoan(null)}
          onConfirm={handleReturnConfirm}
          isPending={returnMutation.isPending}
        />
      )}
    </>
  );
}
```

#### 3. Dialog-Komponente mit Loading State

```tsx
// apps/frontend/src/components/features/ReturnDialog.tsx

export const ReturnDialog = memo(function ReturnDialog({
  loan,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ReturnDialogProps) {
  const [returnNote, setReturnNote] = useState('');

  const handleConfirm = () => {
    const trimmedNote = returnNote.trim();
    onConfirm(loan.id, trimmedNote === '' ? null : sanitizeForDisplay(trimmedNote));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sanitizeForDisplay(loan.device.callSign)} zurückgeben</DialogTitle>
        </DialogHeader>

        <Textarea
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          maxLength={500}
          disabled={isPending}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Wird zurückgegeben...' : 'Zurückgeben'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
```

---

## Implementierungs-Checkliste

### Phase 1: Setup

- [ ] `useMutation` aus `@tanstack/react-query` importieren
- [ ] `useQueryClient` Hook für Cache-Zugriff
- [ ] Context-Type für Rollback-Daten definieren
- [ ] `retry: false` setzen (keine automatischen Retries)

### Phase 2: onMutate (Optimistic Update)

- [ ] Laufende Queries mit `cancelQueries()` abbrechen
- [ ] Snapshot mit `getQueryData()` für Rollback speichern
- [ ] Cache mit `setQueryData()` optimistisch updaten
- [ ] Context mit Rollback-Daten zurückgeben

### Phase 3: UI Integration

- [ ] Werte VOR `mutate()` capturen (Race Condition Prevention!)
- [ ] `isPending` State an UI binden (Button disabled, Spinner)
- [ ] Success-Callback mit PRE-CAPTURED Werten
- [ ] Error-Callback ohne State-Reset (Dialog/Form offen lassen)

### Phase 4: Error Handling

- [ ] `onError`: Rollback mit `setQueryData(context.previousData)`
- [ ] User-Feedback mit Toast-Notification
- [ ] Rollback-Information anzeigen ("Änderung rückgängig gemacht")
- [ ] Dialog/Form offen lassen (keine Datenverlust)

### Phase 5: Cache-Invalidierung

- [ ] `onSettled`: `invalidateQueries()` für primäre Query
- [ ] `invalidateQueries()` für abhängige Queries (z.B. Listen)
- [ ] Query Keys aus zentraler Factory verwenden
- [ ] Nicht zu breit invalidieren (Performance!)

### Phase 6: Testing

- [ ] Unit Test: Erfolgreiche Mutation
- [ ] Unit Test: Optimistic Update funktioniert
- [ ] Unit Test: Rollback bei Fehler
- [ ] Unit Test: Cache-Invalidierung nach Success
- [ ] Integration Test: UI zeigt sofortiges Feedback

---

## Anti-Patterns

### 1. State im onSuccess Callback lesen (Race Condition!)

**Problem:**

```typescript
// FALSCH: State kann sich zwischen mutate() und onSuccess ändern
const handleReturn = () => {
  mutation.mutate({ loanId }, {
    onSuccess: () => {
      // selectedLoan kann hier bereits null oder ein anderes Loan sein!
      toast.success(`${selectedLoan?.device.callSign} zurückgegeben`);
    }
  });
};
```

**Lösung:**

```typescript
// RICHTIG: Werte VOR mutate() capturen
const handleReturn = () => {
  const deviceName = sanitizeForDisplay(selectedLoan.device.callSign);

  mutation.mutate({ loanId }, {
    onSuccess: () => {
      // deviceName ist captured und unveränderlich
      toast.success(`${deviceName} zurückgegeben`);
    }
  });
};
```

### 2. Zu breite Cache-Invalidierung

**Problem:**

```typescript
// FALSCH: Invalidiert den gesamten Cache
onSettled: () => {
  queryClient.invalidateQueries(); // Alle Queries!
}
```

**Lösung:**

```typescript
// RICHTIG: Nur betroffene Queries invalidieren
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: loanKeys.active() });
  queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
}
```

### 3. Fehlende Error-Boundaries

**Problem:**

```typescript
// FALSCH: Kein Fallback bei Component-Crash
<ReturnDialog loan={selectedLoan} />
```

**Lösung:**

```tsx
// RICHTIG: Error-Boundary mit Fallback
<ErrorBoundary
  FallbackComponent={DialogErrorFallback}
  onReset={() => setSelectedLoan(null)}
  onError={(error) => {
    console.error('Dialog crashed:', error);
    toast.error('Dialog konnte nicht geladen werden');
  }}
>
  <ReturnDialog loan={selectedLoan} />
</ErrorBoundary>
```

### 4. Dialog/Form bei Fehler schließen

**Problem:**

```typescript
// FALSCH: User verliert Eingaben bei Fehler
onError: (error) => {
  toast.error(error.message);
  setDialogOpen(false); // Dialog schließt sich!
}
```

**Lösung:**

```typescript
// RICHTIG: Dialog bleibt offen, User behält Eingaben
onError: (error) => {
  toast.error(getUserFriendlyErrorMessage(error));
  toast.info('Änderung wurde rückgängig gemacht');
  // Dialog bleibt offen - kein setDialogOpen(false)
}
```

### 5. Rollback ohne Snapshot

**Problem:**

```typescript
// FALSCH: Keine Rollback-Daten gespeichert
onMutate: async ({ loanId }) => {
  queryClient.setQueryData(['loans'], (old) => old?.filter(l => l.id !== loanId));
  return {}; // Snapshot fehlt!
}
```

**Lösung:**

```typescript
// RICHTIG: Snapshot für Rollback speichern
onMutate: async ({ loanId }) => {
  const previousLoans = queryClient.getQueryData(['loans']);
  queryClient.setQueryData(['loans'], (old) => old?.filter(l => l.id !== loanId));
  return { previousLoans }; // Snapshot im Context
}
```

### 6. Fehlende Query-Cancellation

**Problem:**

```typescript
// FALSCH: Laufende Queries nicht abgebrochen
onMutate: async ({ loanId }) => {
  const previous = queryClient.getQueryData(['loans']);
  queryClient.setQueryData(['loans'], (old) => /* update */);
  return { previous };
}
```

**Lösung:**

```typescript
// RICHTIG: Laufende Queries abbrechen
onMutate: async ({ loanId }) => {
  await queryClient.cancelQueries({ queryKey: ['loans'] }); // WICHTIG!
  const previous = queryClient.getQueryData(['loans']);
  queryClient.setQueryData(['loans'], (old) => /* update */);
  return { previous };
}
```

---

## Troubleshooting

### Problem: Toast zeigt falschen Wert

**Symptom:**
```
// Toast zeigt "undefined" oder alten Wert
toast.success(`${selectedItem?.name} gespeichert`);
```

**Diagnose:**
- Race Condition: State wurde zwischen `mutate()` und `onSuccess` geändert
- Async Callback liest veralteten State

**Lösung:**
```typescript
// Werte VOR mutate() capturen
const itemName = sanitizeForDisplay(selectedItem.name);
mutation.mutate(payload, {
  onSuccess: () => toast.success(`${itemName} gespeichert`)
});
```

---

### Problem: Rollback funktioniert nicht

**Symptom:**
```
// UI zeigt nach Fehler leere Liste
onError: (_err, _vars, context) => {
  queryClient.setQueryData(['data'], context.previousData); // undefined!
}
```

**Diagnose:**
- `onMutate` gibt keinen Context zurück
- Oder Context-Type falsch definiert

**Lösung:**
```typescript
// Context-Type definieren
interface MutationContext {
  previousData: DataType[] | undefined;
}

// Snapshot in onMutate zurückgeben
onMutate: async () => {
  const previousData = queryClient.getQueryData<DataType[]>(['data']);
  return { previousData }; // MUSS zurückgegeben werden!
}
```

---

### Problem: Stale Data nach Update

**Symptom:**
```
// Liste zeigt alte Daten nach erfolgreicher Mutation
```

**Diagnose:**
- `invalidateQueries()` fehlt oder falscher Query Key
- Cache wird nicht aktualisiert

**Lösung:**
```typescript
// onSettled mit korrekten Query Keys
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: dataKeys.all });
  queryClient.invalidateQueries({ queryKey: relatedKeys.lists() });
}
```

---

### Problem: Flashing/Flickering nach Update

**Symptom:**
```
// UI flackert: alte Daten → neue Daten → geladene Daten
```

**Diagnose:**
- Optimistic Update passt nicht zur Server-Response
- Zu breite Invalidierung

**Lösung:**
```typescript
// 1. Optimistic Update exakt wie Server-Response
onMutate: async (payload) => {
  queryClient.setQueryData(['data'], (old) => {
    // Exakt gleiche Logik wie Backend!
    return updatedData;
  });
}

// 2. Nur betroffene Queries invalidieren
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['data'] }); // Nicht queryClient.invalidateQueries()
}
```

---

### Problem: Mutation hängt bei Error

**Symptom:**
```
// Button bleibt disabled, isPending bleibt true
```

**Diagnose:**
- Error wird nicht geworfen
- `onError` Callback fehlt

**Lösung:**
```typescript
// 1. API-Funktion muss Error werfen
async function apiFunction(payload) {
  const response = await fetch(...);
  if (!response.ok) {
    throw new Error('API Error'); // WICHTIG!
  }
  return response.json();
}

// 2. onError Callback implementieren
useMutation({
  mutationFn: apiFunction,
  onError: (error) => {
    console.error(error);
    toast.error('Fehler aufgetreten');
  }
});
```

---

## Referenzen

### Projekt-Learnings

- **Epic 4 Retrospektive** (`docs/sprint-artifacts/epic-4-retrospective.md`)
  - Racing Conditions bei Success Toast (H4)
  - String-Transformation Order (M6)
  - Optimistic UI Pattern (Story 4.3)

- **Story 4.3 Validation Report** (`docs/sprint-artifacts/validation-report-4-3-2025-12-19.md`)
  - Code Review Findings
  - Security Issues (H5: XSS)
  - Performance Optimierungen

### Code-Beispiele im Projekt

- `apps/frontend/src/api/loans.ts` - `useReturnDevice()`, `useCreateLoan()`
- `apps/frontend/src/routes/return.tsx` - Race-Condition-Prevention
- `apps/frontend/src/routes/loan.tsx` - Loan Creation Optimistic UI
- `apps/frontend/src/components/features/ConfirmLoanButton.tsx` - Loading States

### Externe Dokumentation

- [TanStack Query - Optimistic Updates](https://tanstack.com/query/latest/docs/guides/optimistic-updates)
- [TanStack Query - Mutations](https://tanstack.com/query/latest/docs/guides/mutations)

---

## Version History

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-12-19 | Initiale Version basierend auf Epic 4 Learnings |

---

**Erstellt von:** Charlie (Senior Dev)
**Reviewed von:** Bob (Scrum Master), Dana (QA Engineer)
**Approved von:** Ruben (Project Lead)
