/**
 * Error messages for the application
 *
 * NOTE: German messages are intentional for this internal fire department system.
 * No i18n is planned as all users are German-speaking personnel.
 */
export const ERROR_MESSAGES = {
  // Device errors
  DEVICE_NOT_FOUND: 'Gerät nicht gefunden',
  DEVICE_NOT_AVAILABLE: 'Gerät ist bereits ausgeliehen oder nicht verfügbar',
  DEVICE_STATUS_CHANGED: 'Gerätestatus wurde bereits geändert',
  DEVICE_JUST_LOANED: 'Gerät wurde soeben ausgeliehen',

  // Loan errors
  LOAN_NOT_FOUND: 'Ausleihe nicht gefunden',
  LOAN_ALREADY_RETURNED: 'Ausleihe wurde bereits zurückgegeben',
  LOAN_JUST_RETURNED: 'Ausleihe wurde soeben von jemand anderem zurückgegeben',

  // Generic errors
  DATABASE_OPERATION_FAILED: 'Database operation failed',

  // String transformation errors
  INPUT_TOO_LONG: 'Eingabe überschreitet die maximal erlaubte Länge',
  STRING_TOO_LONG_AFTER_NORMALIZATION: 'Zeichenkette überschreitet maximale Länge nach Normalisierung',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
