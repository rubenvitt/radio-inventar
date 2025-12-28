// packages/shared/src/constants/setup.constants.ts

/**
 * Setup-related error messages (German)
 */
export const SETUP_ERROR_MESSAGES = Object.freeze({
  ALREADY_COMPLETE: 'Setup wurde bereits abgeschlossen',
  CREATION_FAILED: 'Admin-Erstellung fehlgeschlagen',
  ADMIN_EXISTS: 'Ein Admin-Benutzer existiert bereits',
} as const);

/**
 * Setup configuration constants
 */
export const SETUP_CONFIG = Object.freeze({
  // Rate limiting for setup endpoint (prevent brute force on fresh install)
  RATE_LIMIT_ATTEMPTS: 10,
  RATE_LIMIT_TTL_MS: 15 * 60 * 1000, // 15 minutes
} as const);
