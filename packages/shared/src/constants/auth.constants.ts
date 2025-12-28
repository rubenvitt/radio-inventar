// packages/shared/src/constants/auth.constants.ts
export const AUTH_ERROR_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: 'Ungültige Zugangsdaten',
  SESSION_EXPIRED: 'Sitzung abgelaufen oder ungültig',
  SESSION_REQUIRED: 'Authentifizierung erforderlich',
  TOO_MANY_ATTEMPTS: 'Zu viele Login-Versuche. Bitte später erneut versuchen.',
  NETWORK_ERROR: 'Verbindungsfehler. Bitte später erneut versuchen.',
} as const);

export const AUTH_CONFIG = Object.freeze({
  // bcrypt rounds - AC9 requires minimum 10, we use 12 for better security
  BCRYPT_ROUNDS: 12,
  // Rate limiting: 5 attempts per 15 minutes (production)
  RATE_LIMIT_ATTEMPTS: 5,
  // Rate limiting: 100 attempts for test environment (Review #2: testable constant)
  RATE_LIMIT_TEST_ATTEMPTS: 100,
  RATE_LIMIT_TTL_MS: 15 * 60 * 1000, // 15 minutes in milliseconds
  // Session timeout: 24 hours (AC5)
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000,
  // Session cookie name (Review #2: centralized constant)
  SESSION_COOKIE_NAME: 'radio-inventar.sid',
} as const);

