import { ApiErrorSchema, type ApiError } from '@radio-inventar/shared';

/**
 * Type guard to check if error is an ApiError from backend
 */
function isApiError(error: unknown): error is ApiError {
  return ApiErrorSchema.safeParse(error).success;
}

/**
 * Maps technical error messages to user-friendly German messages.
 * Never exposes raw error messages to prevent information leakage.
 *
 * Note: For context-specific error messages, the calling code can override
 * the returned message based on the specific use case.
 */
export function getUserFriendlyErrorMessage(error: Error | ApiError | null): string {
  if (!error) return 'Ein unbekannter Fehler ist aufgetreten.';

  // Check for structured ApiError first (M2)
  if (isApiError(error)) {
    const statusCode = error.statusCode;

    if (statusCode === 409) {
      return 'Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.';
    }
    if (statusCode === 404) {
      return 'Die angeforderten Daten wurden nicht gefunden.';
    }
    if (statusCode === 401 || statusCode === 403) {
      return 'Sie haben keine Berechtigung für diese Aktion.';
    }
    if (statusCode >= 500) {
      return 'Der Server ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.';
    }

    // Return backend message if available, otherwise fallback
    return error.message || 'Ein Fehler ist aufgetreten.';
  }

  // Fallback for Error objects
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.';
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return 'Der Server ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.';
  }

  // Client errors (4xx)
  if (message.includes('401') || message.includes('403')) {
    return 'Sie haben keine Berechtigung für diese Aktion.';
  }

  // 409 Conflict - Device already loaned (AC#8)
  if (message.includes('409') || message.includes('conflict') || message.includes('bereits ausgeliehen') || message.includes('nicht verfügbar')) {
    return 'Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.';
  }

  if (message.includes('404')) {
    return 'Die angeforderten Daten wurden nicht gefunden.';
  }

  // Default fallback - never expose raw error message
  return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
}
