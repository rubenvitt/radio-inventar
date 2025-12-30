/**
 * Public Print Template API
 * Handles PDF generation and download for device list print template
 * Available without authentication for convenience
 */

import { ApiError } from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Timeout for PDF generation (longer than standard API calls) */
const PDF_TIMEOUT_MS = 30000;

/**
 * Centralized error messages for public print template API
 */
export const PRINT_API_ERRORS: Record<number, string> = {
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
 * Downloads the print template PDF from the public endpoint.
 * Returns a Blob that can be used to create a download link.
 *
 * @throws {ApiError} When the API returns an error status
 * @throws {Error} When the response is not a valid PDF
 */
export async function downloadPublicPrintTemplate(): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/devices/print-template`, {
      method: 'GET',
      // No credentials required - public endpoint
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

  // 500ms cleanup - Safari needs time to process blob
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
