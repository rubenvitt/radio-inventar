/**
 * Story 6.5: Admin Print Template API
 * Handles PDF generation and download for device list print template
 */

import { ApiError } from './client';
import { tokenStorage } from '@/lib/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Timeout for PDF generation (longer than standard API calls) */
const PDF_TIMEOUT_MS = 30000;

/**
 * Centralized error messages for print template API
 * Pattern from Story 6.3/6.4
 *
 * FIX C2: Uses context-specific messages for PDF errors (e.g., "PDF-Generierung fehlgeschlagen")
 * instead of generic messages from lib/error-messages.ts. This is intentional for better UX
 * in the print context. See getUserFriendlyErrorMessage() for general API error handling.
 */
export const PRINT_API_ERRORS: Record<number, string> = {
  401: 'Authentifizierung erforderlich',
  403: 'Zugriff verweigert',
  429: 'Zu viele Anfragen. Bitte später erneut versuchen.',
  500: 'PDF-Generierung fehlgeschlagen. Bitte erneut versuchen.',
  503: 'Server überlastet. Bitte später erneut versuchen.',
};

/**
 * Gets a user-friendly German error message for print template errors
 */
export function getPrintErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return PRINT_API_ERRORS[error.status] || 'Ein Fehler ist aufgetreten.';
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Zeitüberschreitung. Bitte erneut versuchen.';
  }
  if (error instanceof Error && error.message.includes('fetch')) {
    return 'Keine Verbindung zum Server.';
  }
  return 'PDF-Generierung fehlgeschlagen. Bitte erneut versuchen.';
}

/**
 * Downloads the print template PDF from the backend.
 * Returns a Blob that can be used to create a download link.
 *
 * @throws {ApiError} When the API returns an error status
 * @throws {Error} When the response is not a valid PDF
 */
export async function downloadPrintTemplate(): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

  try {
    // Build headers with API token for dual auth (API token + session)
    const headers: HeadersInit = {};
    const token = tokenStorage.get();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/devices/print-template`, {
      method: 'GET',
      headers,
      credentials: 'include', // Required for session cookies
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, response.statusText, errorText);
    }

    // Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/pdf')) {
      throw new Error('Invalid response: expected PDF');
    }

    return response.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper function to trigger a file download from a Blob.
 * Creates a temporary link and triggers a click to download.
 *
 * @param blob - The file blob to download
 * @param filename - The filename for the downloaded file
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // 500ms cleanup (not 100ms) - Safari needs time to process blob
  // Learned from Story 6.4 CSV export
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
