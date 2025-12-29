export const API_TOKEN_ERROR_MESSAGES = Object.freeze({
  MISSING_TOKEN: 'API-Token fehlt',
  INVALID_TOKEN: 'Ungültiger API-Token',
} as const);

export const API_TOKEN_CONFIG = Object.freeze({
  HEADER_NAME: 'Authorization',
  STORAGE_KEY: 'radio-inventar-api-token',
  MIN_LENGTH: 32,
} as const);
