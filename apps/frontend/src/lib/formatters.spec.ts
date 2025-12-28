import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './formatters';

describe('formatDate', () => {
  it('should format valid ISO date string in de-DE locale', () => {
    const result = formatDate('2024-03-15T10:30:00Z');
    // de-DE format: DD.MM.YYYY
    expect(result).toBe('15.3.2024');
  });

  it('should format date-only string', () => {
    const result = formatDate('2024-12-25');
    expect(result).toBe('25.12.2024');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  it('should return empty string for empty string input', () => {
    expect(formatDate('')).toBe('');
  });

  it('should handle edge case dates', () => {
    // Epoch
    expect(formatDate('1970-01-01T00:00:00Z')).toBe('1.1.1970');
    // Future date - Note: UTC midnight may shift to next day in local timezone
    const futureResult = formatDate('2099-12-31T12:00:00Z');
    expect(futureResult).toMatch(/31\.12\.2099|1\.1\.2100/);
  });

  it('should handle dates with timezone offsets', () => {
    const result = formatDate('2024-06-15T14:30:00+02:00');
    expect(result).toBe('15.6.2024');
  });
});

// Story 6.4: formatDateTime tests (extracted from HistoryTable.tsx)
describe('formatDateTime', () => {
  it('should format valid ISO datetime in German locale as "DD.MM.YYYY, HH:mm"', () => {
    // Note: This test uses UTC time, but formatDateTime uses local timezone
    // The result may vary depending on the test environment timezone
    const result = formatDateTime('2024-03-15T10:30:00Z');
    // Match pattern: DD.MM.YYYY, HH:mm
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });

  it('should format datetime with correct day and month', () => {
    const result = formatDateTime('2024-12-25T14:30:00Z');
    expect(result).toContain('25.12.2024');
  });

  it('should return "Ungültiges Datum" for invalid date string', () => {
    expect(formatDateTime('invalid-date')).toBe('Ungültiges Datum');
    expect(formatDateTime('not a date')).toBe('Ungültiges Datum');
  });

  it('should return "Ungültiges Datum" for empty string', () => {
    expect(formatDateTime('')).toBe('Ungültiges Datum');
  });

  it('should handle German umlauts in date context (locale test)', () => {
    // formatDateTime uses German locale, verify it works
    const result = formatDateTime('2024-06-15T14:30:00Z');
    expect(result).not.toBe('Ungültiges Datum');
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('should handle midnight correctly', () => {
    const result = formatDateTime('2024-01-01T00:00:00Z');
    expect(result).not.toBe('Ungültiges Datum');
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it('should handle dates near year boundaries', () => {
    expect(formatDateTime('2024-12-31T23:59:00Z')).not.toBe('Ungültiges Datum');
    expect(formatDateTime('2025-01-01T00:01:00Z')).not.toBe('Ungültiges Datum');
  });
});
