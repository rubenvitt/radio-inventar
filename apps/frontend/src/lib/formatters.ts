import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Safely formats a date string for display in German locale.
 * Returns empty string if date is invalid.
 *
 * @param dateStr - ISO date string to format
 * @returns Formatted date string in de-DE locale or empty string if invalid
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE');
  } catch {
    return '';
  }
}

/**
 * Formats a date string with time for display in German locale.
 * Returns error message if date is invalid.
 *
 * @param dateStr - ISO date string to format
 * @returns Formatted date-time string as "DD.MM.YYYY, HH:mm" or error message
 */
export function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';
    return format(date, 'dd.MM.yyyy, HH:mm', { locale: de });
  } catch {
    return 'Ungültiges Datum';
  }
}
