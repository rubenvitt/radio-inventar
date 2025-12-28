/**
 * German error messages for device-related operations.
 * These constants ensure consistent error messaging across the application.
 */
export const DEVICE_ERROR_MESSAGES = Object.freeze({
  NOT_FOUND: 'Gerät nicht gefunden',
  DUPLICATE_CALLSIGN: 'Funkruf existiert bereits',
  CANNOT_DELETE_ON_LOAN: 'Gerät kann nicht gelöscht werden, da es ausgeliehen ist',
  CANNOT_SET_ON_LOAN: 'Status ON_LOAN kann nicht manuell gesetzt werden',
  DATABASE_ERROR: 'Datenbankoperation fehlgeschlagen',
} as const);

export type DeviceErrorMessageKey = keyof typeof DEVICE_ERROR_MESSAGES;
