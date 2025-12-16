# @radio-inventar/shared

Gemeinsame Typen und Zod-Schemas für das Radio-Inventar-System.

## Installation

Dieses Package ist Teil des Monorepos und wird automatisch über pnpm workspaces verlinkt.

```typescript
import { Device, DeviceSchema, CreateLoanSchema } from '@radio-inventar/shared';
```

## Schemas

### Device

```typescript
import {
  DeviceSchema,
  DeviceStatus,
  DeviceStatusEnum,
  CreateDeviceSchema,
  DEVICE_FIELD_LIMITS
} from '@radio-inventar/shared';

// Validierung mit parse (wirft Error bei ungültigen Daten)
const device = DeviceSchema.parse(data);

// Sichere Validierung mit safeParse (empfohlen)
const result = DeviceSchema.safeParse(data);
if (result.success) {
  const device = result.data; // Typsicherer Zugriff auf validierte Daten
  console.log('Gültiges Gerät:', device);
} else {
  // Fehlerbehandlung: formatiere Zod-Fehler für Benutzer
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  console.error('Validierungsfehler:', errors);
  // In Production: return 400 Bad Request mit errors
}

// Status-Enum: 'AVAILABLE' | 'ON_LOAN' | 'DEFECT' | 'MAINTENANCE'
// Zugriff auf alle Enum-Werte:
DeviceStatusEnum.enum // { AVAILABLE: 'AVAILABLE', ON_LOAN: 'ON_LOAN', ... }
DeviceStatusEnum.options // ['AVAILABLE', 'ON_LOAN', 'DEFECT', 'MAINTENANCE']

// Verwendung des Status-Enums
const status: DeviceStatus = 'AVAILABLE';
const isValid = DeviceStatusEnum.safeParse(status);

// Feldlängen-Limits
console.log(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX); // 50
console.log(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX); // 100
console.log(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX); // 100
console.log(DEVICE_FIELD_LIMITS.NOTES_MAX); // 500
```

### Loan

```typescript
import {
  LoanSchema,
  CreateLoanSchema,
  ReturnLoanSchema,
  LOAN_FIELD_LIMITS
} from '@radio-inventar/shared';

// Neue Ausleihe erstellen
const createLoan = CreateLoanSchema.parse({
  deviceId: 'cmb8qvznl0000lk08ahhef0nm',
  borrowerName: 'Erika Musterfrau',
});

// Gerät zurückgeben
const returnData = ReturnLoanSchema.parse({
  returnNote: 'Gerät in gutem Zustand zurückgegeben',
});

// Ohne Notiz zurückgeben
const returnWithoutNote = ReturnLoanSchema.parse({});

// Feldlängen-Limits für Formulare
console.log(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX); // 100
console.log(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX);   // 500
```

### Borrower

```typescript
import { BorrowerSuggestionSchema, BorrowerSuggestion, BORROWER_FIELD_LIMITS } from '@radio-inventar/shared';

// Für Autocomplete-Vorschläge (konsistente Personas mit Loan-Beispielen)
const suggestions: BorrowerSuggestion[] = [
  { name: 'Max Mustermann', lastUsed: new Date('2025-12-14') },
  { name: 'Erika Musterfrau', lastUsed: new Date('2025-12-10') },
];

// Validieren eines Vorschlags
const result = BorrowerSuggestionSchema.safeParse({
  name: 'Neuer Benutzer',
  lastUsed: new Date(),
});

if (result.success) {
  console.log('Gültiger Vorschlag:', result.data.name);
}

// Feldlängen-Limit (identisch mit LOAN_FIELD_LIMITS.BORROWER_NAME_MAX)
console.log(BORROWER_FIELD_LIMITS.NAME_MAX); // 100
```

## Typ-Inferenz

Alle Typen werden aus Zod-Schemas inferiert:

```typescript
import { z } from 'zod';
import { DeviceSchema } from '@radio-inventar/shared';

type Device = z.infer<typeof DeviceSchema>;
// Oder direkt importieren:
import { Device } from '@radio-inventar/shared';
```

## Scripts

```bash
pnpm -F @radio-inventar/shared build      # TypeScript kompilieren
pnpm -F @radio-inventar/shared typecheck  # Typ-Prüfung
pnpm -F @radio-inventar/shared dev        # Watch-Mode
```
