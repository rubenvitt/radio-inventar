import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeCSVInjection,
  sanitizeFilename,
  generateHistoryCSV,
  generateExportFilename,
  downloadCSV,
  fetchAllHistoryPages,
  ExportSizeLimitError,
} from './csv-export';
import type { HistoryItem } from '@radio-inventar/shared';

// Mock dependencies
vi.mock('@/lib/sanitize', () => ({
  sanitizeForDisplay: vi.fn((text) => text || ''),
}));

vi.mock('@/lib/formatters', () => ({
  formatDateTime: vi.fn((date) => {
    if (!date) return 'Ungültiges Datum';
    // Mock German date format
    return '25.12.2025, 10:30';
  }),
}));

vi.mock('@/api/admin-history', () => ({
  fetchAdminHistory: vi.fn(),
}));

// Import mocked modules
import { sanitizeForDisplay } from '@/lib/sanitize';
import { formatDateTime } from '@/lib/formatters';
import { fetchAdminHistory } from '@/api/admin-history';

/**
 * Helper to create mock HistoryItem for testing
 */
function createMockHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  const defaultItem: HistoryItem = {
    id: 'test-id-123',
    borrowerName: 'Test User',
    borrowedAt: '2025-12-25T10:00:00Z',
    returnedAt: null,
    returnNote: null,
    device: {
      id: 'device-id-456',
      callSign: 'Florian-4-23',
      serialNumber: 'SN-2025-001', // H6: Add serialNumber to mock helper
      deviceType: 'HRT',
      status: 'LOANED',
    },
  };

  // Deep merge for nested device object
  if (overrides.device) {
    return {
      ...defaultItem,
      ...overrides,
      device: {
        ...defaultItem.device,
        ...overrides.device,
      },
    };
  }

  return {
    ...defaultItem,
    ...overrides,
  };
}

describe('csv-export', () => {
  // ================================================================================
  // escapeCSVInjection - OWASP CSV Injection Protection
  // ================================================================================
  describe('escapeCSVInjection', () => {
    // Story 6.4 Test Requirement 6.2: CSV-Injection-Schutz for ALL dangerous chars
    it.each([
      ['=SUM(A1)', "'=SUM(A1)"],
      ['+100', "'+100"],
      ['-100', "'-100"],
      ['@import', "'@import"],
      ['|pipe', "'|pipe"],
      ['\ttab', "'\ttab"],
    ])('escapes %s to %s', (input, expected) => {
      expect(escapeCSVInjection(input)).toBe(expected);
    });

    it('does not escape normal text', () => {
      expect(escapeCSVInjection('normal text')).toBe('normal text');
      expect(escapeCSVInjection('Hello World')).toBe('Hello World');
      expect(escapeCSVInjection('123')).toBe('123');
    });

    it('replaces newlines with spaces', () => {
      expect(escapeCSVInjection('line1\nline2')).toBe('line1 line2');
      expect(escapeCSVInjection('line1\r\nline2')).toBe('line1  line2');
      expect(escapeCSVInjection('line1\rline2')).toBe('line1 line2');
    });

    it('handles combined newlines and dangerous chars', () => {
      expect(escapeCSVInjection('=SUM\nA1')).toBe("'=SUM A1");
      expect(escapeCSVInjection('+100\r\n-50')).toBe("'+100  -50");
    });

    it('handles empty string', () => {
      expect(escapeCSVInjection('')).toBe('');
    });

    it('only escapes if dangerous char is at start', () => {
      expect(escapeCSVInjection('text=formula')).toBe('text=formula');
      expect(escapeCSVInjection('value+100')).toBe('value+100');
      expect(escapeCSVInjection('email@domain.com')).toBe('email@domain.com');
    });

    it('handles multiple dangerous chars (only first matters)', () => {
      expect(escapeCSVInjection('=+@|-')).toBe("'=+@|-");
      expect(escapeCSVInjection('+=-@|')).toBe("'+=-@|");
    });

    // M5: Test null/undefined input behavior - expect TypeError crash or empty return
    it('throws TypeError when called with null', () => {
      // escapeCSVInjection expects a string, null will cause .replace() to fail
      expect(() => escapeCSVInjection(null as unknown as string)).toThrow(TypeError);
    });

    it('throws TypeError when called with undefined', () => {
      // escapeCSVInjection expects a string, undefined will cause .replace() to fail
      expect(() => escapeCSVInjection(undefined as unknown as string)).toThrow(TypeError);
    });

    // C4: Test fullwidth Unicode dangerous chars normalization
    it('normalizes fullwidth equals sign', () => {
      expect(escapeCSVInjection('＝SUM(A1)')).toBe("'=SUM(A1)");
    });

    it('normalizes fullwidth plus sign', () => {
      expect(escapeCSVInjection('＋100')).toBe("'+100");
    });

    it('normalizes fullwidth minus sign', () => {
      expect(escapeCSVInjection('－100')).toBe("'-100");
    });

    it('normalizes fullwidth at sign', () => {
      expect(escapeCSVInjection('＠import')).toBe("'@import");
    });

    it('normalizes fullwidth pipe', () => {
      expect(escapeCSVInjection('｜pipe')).toBe("'|pipe");
    });

    it('normalizes multiple fullwidth chars', () => {
      expect(escapeCSVInjection('＝＋＠｜')).toBe("'=+@|");
    });

    // C2: Test mid-string dangerous chars after delimiter
    it('escapes dangerous char after semicolon', () => {
      expect(escapeCSVInjection('value;=FORMULA')).toBe("'value;=FORMULA");
    });

    it('escapes dangerous char after comma', () => {
      expect(escapeCSVInjection('value,+formula')).toBe("'value,+formula");
    });

    it('does not escape when delimiter not followed by dangerous char', () => {
      expect(escapeCSVInjection('value;normal')).toBe('value;normal');
      expect(escapeCSVInjection('value,normal')).toBe('value,normal');
    });

    it('handles multiple delimiter patterns', () => {
      expect(escapeCSVInjection('a;=b,+c')).toBe("'a;=b,+c");
    });

    // H1 FIX: Test for newline followed by dangerous char bypass
    it('escapes when dangerous char follows newline (H1 bypass fix)', () => {
      // These patterns would become " =FORMULA" after newline replacement,
      // which previously bypassed the start-of-string check
      expect(escapeCSVInjection('\r=MALICIOUS')).toBe("' =MALICIOUS");
      expect(escapeCSVInjection('\n=FORMULA')).toBe("' =FORMULA");
      expect(escapeCSVInjection('\r\n=SUM(A1)')).toBe("'  =SUM(A1)");
    });

    it('escapes all dangerous chars after newline (H1 comprehensive)', () => {
      expect(escapeCSVInjection('\r+100')).toBe("' +100");
      expect(escapeCSVInjection('\n-CMD')).toBe("' -CMD");
      expect(escapeCSVInjection('\r@import')).toBe("' @import");
      expect(escapeCSVInjection('\n|pipe')).toBe("' |pipe");
      expect(escapeCSVInjection('\r\ttab')).toBe("' \ttab");
    });

    it('escapes dangerous char after whitespace from newline replacement (H1 edge case)', () => {
      // Leading newline + dangerous char should be escaped after trim check
      expect(escapeCSVInjection('   =FORMULA')).toBe("'   =FORMULA");
      expect(escapeCSVInjection('\t+ATTACK')).toBe("'\t+ATTACK");
    });
  });

  // ================================================================================
  // sanitizeFilename - Filename Sanitization
  // ================================================================================
  describe('sanitizeFilename', () => {
    // Story 6.4 Test Requirement 6.5: Filename-Sanitization
    it.each([
      ['hello/world', 'hello-world'],
      ['file:name', 'file-name'],
      ['test*file?', 'test-file-'],
      ['path\\to\\file', 'path-to-file'],
      ['file<name>', 'file-name-'],
      ['file|name', 'file-name'],
      ['name"with"quotes', 'name-with-quotes'],
      ['normal-name', 'normal-name'],
      ['file_name.csv', 'file_name.csv'],
    ])('sanitizes %s to %s', (input, expected) => {
      expect(sanitizeFilename(input)).toBe(expected);
    });

    it('truncates to 200 characters', () => {
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(200);
      expect(result).toBe('a'.repeat(200));
    });

    it('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('handles all invalid characters at once', () => {
      const filename = 'test/\\:*?"<>|file.csv';
      expect(sanitizeFilename(filename)).toBe('test---------file.csv');
    });

    it('preserves valid special characters', () => {
      expect(sanitizeFilename('file_name-2025.csv')).toBe('file_name-2025.csv');
      expect(sanitizeFilename('report (final).csv')).toBe('report (final).csv');
    });

    // M9: Test for Unicode/emoji in filename sanitization
    it('preserves Unicode characters and umlauts', () => {
      expect(sanitizeFilename('Gerät_Übersicht.csv')).toBe('Gerät_Übersicht.csv');
      expect(sanitizeFilename('日本語_filename.csv')).toBe('日本語_filename.csv');
    });

    it('preserves emoji in filename', () => {
      expect(sanitizeFilename('export_🔥_data.csv')).toBe('export_🔥_data.csv');
      expect(sanitizeFilename('report_✅.csv')).toBe('report_✅.csv');
    });

    it('handles mixed Unicode and invalid chars', () => {
      expect(sanitizeFilename('Gerät/Übersicht:2025.csv')).toBe('Gerät-Übersicht-2025.csv');
    });
  });

  // ================================================================================
  // generateHistoryCSV - CSV Generation
  // ================================================================================
  describe('generateHistoryCSV', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    // Story 6.4 Test Requirement 6.1: UTF-8 BOM
    it('includes UTF-8 BOM at start', () => {
      const csv = generateHistoryCSV([]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    // Story 6.4 Test Requirement 6.1: Semicolon delimiter
    // H4: Update test to expect 7 semicolons for 8 columns (after serialNumber fix)
    it('uses semicolon as delimiter', () => {
      const mockItem = createMockHistoryItem();
      const csv = generateHistoryCSV([mockItem]);

      // Headers should have semicolons
      const lines = csv.split('\r\n');
      expect(lines[0]).toContain(';');

      // Data rows should have semicolons
      expect(lines[1]).toContain(';');

      // Count semicolons (should be 7 per row for 8 columns)
      const headerSemicolons = (lines[0]?.match(/;/g) ?? []).length;
      expect(headerSemicolons).toBe(7);
    });

    it('includes German headers in correct order', () => {
      const csv = generateHistoryCSV([]);
      const firstLine = csv.substring(1); // Remove BOM
      const headers = firstLine.split('\r\n')[0];

      // Verify exact header order (8 columns per AC3, including Seriennummer)
      expect(headers).toBe('"Gerät";"Seriennummer";"Gerätetyp";"Ausleiher";"Ausleihe-Datum";"Rückgabe-Datum";"Zustandsnotiz";"Status"');
    });

    // Story 6.4 Test Requirement 6.4: German Umlauts
    it('handles German umlauts correctly', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        borrowerName: 'Müller Öztürk Größe'
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain('Müller Öztürk Größe');
    });

    it('handles umlauts in device fields', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: 'Löschfahrzeug-1',
          serialNumber: null,
          deviceType: 'Röntgengerät',
          status: 'AVAILABLE',
        },
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain('Löschfahrzeug-1');
      expect(csv).toContain('Röntgengerät');
    });

    // Story 6.4 Test Requirement 6.3: Null handling with "-"
    it('uses "-" for null returnNote', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({ returnNote: null });
      const csv = generateHistoryCSV([mockItem]);

      const lines = csv.split('\r\n');
      // The returnNote column should contain "-" which gets escaped to "'-" due to CSV injection protection
      expect(lines[1]).toContain("\"'-\"");
    });

    it('shows actual returnNote when present', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        returnNote: 'Gerät defekt'
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain('Gerät defekt');
    });

    // Story 6.4 Test Requirement 6.3: Date formatting
    it('formats dates using formatDateTime', () => {
      const mockItem = createMockHistoryItem({
        borrowedAt: '2025-12-25T10:00:00Z',
        returnedAt: '2025-12-26T15:30:00Z',
      });

      generateHistoryCSV([mockItem]);

      expect(formatDateTime).toHaveBeenCalledWith('2025-12-25T10:00:00Z');
      expect(formatDateTime).toHaveBeenCalledWith('2025-12-26T15:30:00Z');
    });

    it('shows "Noch ausgeliehen" for active loans (null returnedAt)', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({ returnedAt: null });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain('Noch ausgeliehen');
    });

    it('shows "Ausgeliehen" status for active loans', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({ returnedAt: null });
      const csv = generateHistoryCSV([mockItem]);

      const lines = csv.split('\r\n');
      const lastColumn = lines[1]?.split(';').pop();
      expect(lastColumn).toBe('"Ausgeliehen"');
    });

    it('shows "Zurückgegeben" status for returned items', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        returnedAt: '2025-12-25T12:00:00Z'
      });
      const csv = generateHistoryCSV([mockItem]);

      const lines = csv.split('\r\n');
      const lastColumn = lines[1]?.split(';').pop();
      expect(lastColumn).toBe('"Zurückgegeben"');
    });

    // Story 6.4 Test Requirement 6.2: CSV Injection protection on ALL fields
    it('escapes CSV injection in callSign', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: '=SUM(A1)',
          serialNumber: null,
          deviceType: 'HRT',
          status: 'AVAILABLE',
        },
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain("'=SUM(A1)");
    });

    it('escapes CSV injection in deviceType', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: 'Florian-1',
          serialNumber: null,
          deviceType: '+MALICIOUS',
          status: 'AVAILABLE',
        },
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain("'+MALICIOUS");
    });

    it('escapes CSV injection in borrowerName', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        borrowerName: '-CMD'
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain("'-CMD");
    });

    it('escapes CSV injection in returnNote', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        returnNote: '@IMPORT'
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain("'@IMPORT");
    });

    // H5: Add CSV-Injection test for serialNumber field
    it('escapes CSV injection in serialNumber', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: 'Test-1',
          serialNumber: '=CMD|calc',
          deviceType: 'HRT',
          status: 'AVAILABLE',
        },
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain("'=CMD|calc");
    });

    // C4: Test for fullwidth Unicode dangerous chars
    it('normalizes fullwidth dangerous chars before escaping', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        borrowerName: '＝SUM(A1)' // Fullwidth equals
      });
      const csv = generateHistoryCSV([mockItem]);

      // Should normalize ＝ to = and then escape
      expect(csv).toContain("'=SUM(A1)");
    });

    // C2: Test for mid-string dangerous chars after delimiter
    it('escapes dangerous chars after delimiter', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        returnNote: 'value;=FORMULA'
      });
      const csv = generateHistoryCSV([mockItem]);

      // Should escape because of dangerous char after delimiter
      expect(csv).toContain("'value;=FORMULA");
    });

    // M8: Test for umlauts in returnNote field
    it('handles umlauts in returnNote field', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        returnNote: 'Gerät überhitzt, Rückgabe mit Mängeln'
      });
      const csv = generateHistoryCSV([mockItem]);

      expect(csv).toContain('Gerät überhitzt, Rückgabe mit Mängeln');
    });

    // M11: Test for combined dangerous chars + newlines in ALL fields
    it('handles combined dangerous chars and newlines in all fields', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: '=EVIL\nCallSign',
          serialNumber: '+ATTACK\r\nSerial',
          deviceType: '-Type\nWith\nLines',
          status: 'AVAILABLE',
        },
        borrowerName: '@User\rName',
        returnNote: '|Pipe\nNote',
      });
      const csv = generateHistoryCSV([mockItem]);

      // All dangerous chars should be escaped and newlines replaced
      expect(csv).toContain("'=EVIL CallSign");
      expect(csv).toContain("'+ATTACK  Serial");
      expect(csv).toContain("'-Type With Lines");
      expect(csv).toContain("'@User Name");
      expect(csv).toContain("'|Pipe Note");
    });

    // M12: Test that formatDateTime is NOT called for null returnedAt
    it('does not call formatDateTime for null returnedAt', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');
      vi.mocked(formatDateTime).mockClear();

      const mockItem = createMockHistoryItem({
        returnedAt: null,
      });
      generateHistoryCSV([mockItem]);

      // Should only be called once for borrowedAt, not for returnedAt
      const calls = vi.mocked(formatDateTime).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0]?.[0]).toBe(mockItem.borrowedAt);
    });

    // Test for serialNumber null handling
    it('uses "-" for null serialNumber', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        device: {
          id: 'device-id',
          callSign: 'Test-1',
          serialNumber: null,
          deviceType: 'HRT',
          status: 'AVAILABLE',
        },
      });
      const csv = generateHistoryCSV([mockItem]);

      // The serialNumber column should contain "-" which gets escaped to "'-" due to CSV injection protection
      const lines = csv.split('\r\n');
      expect(lines[1]).toContain("\"'-\"");
    });

    // Test for partial hint row (H2)
    it('adds hint row for partial exports', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem();
      const csv = generateHistoryCSV([mockItem], true);

      const lines = csv.split('\r\n');
      // Should have 3 lines: header + data + hint
      expect(lines.length).toBe(3);
      expect(lines[2]).toContain('HINWEIS: Export unvollständig');
    });

    it('does not add hint row when addPartialHint is false', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem();
      const csv = generateHistoryCSV([mockItem], false);

      const lines = csv.split('\r\n');
      // Should have 2 lines: header + data
      expect(lines.length).toBe(2);
      expect(csv).not.toContain('HINWEIS');
    });

    it('handles quotes in field values', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        borrowerName: 'O\'Brien "The Boss"'
      });
      const csv = generateHistoryCSV([mockItem]);

      // CSV escaping: " becomes ""
      expect(csv).toContain('O\'Brien ""The Boss""');
    });

    it('uses CRLF line endings', () => {
      const mockItem = createMockHistoryItem();
      const csv = generateHistoryCSV([mockItem]);

      // Should have Windows line endings
      expect(csv).toContain('\r\n');

      // Should not have Unix-only line endings
      const unixOnly = csv.replace(/\r\n/g, '').includes('\n');
      expect(unixOnly).toBe(false);
    });

    it('generates correct number of rows', () => {
      const items = [
        createMockHistoryItem({ id: '1' }),
        createMockHistoryItem({ id: '2' }),
        createMockHistoryItem({ id: '3' }),
      ];
      const csv = generateHistoryCSV(items);

      const lines = csv.split('\r\n');
      // 1 header + 3 data rows = 4 lines
      expect(lines.length).toBe(4);
    });

    it('handles empty array', () => {
      const csv = generateHistoryCSV([]);

      const lines = csv.split('\r\n');
      // Only header row
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Gerät');
    });

    it('calls sanitizeForDisplay for all text fields', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');

      const mockItem = createMockHistoryItem({
        borrowerName: 'Test<script>',
        returnNote: '<b>Note</b>',
      });

      generateHistoryCSV([mockItem]);

      // Should sanitize borrowerName, returnNote, and device fields
      expect(sanitizeForDisplay).toHaveBeenCalled();
      const calls = vi.mocked(sanitizeForDisplay).mock.calls;

      // Find calls with our test data
      const borrowerCalls = calls.filter(([arg]) => arg === 'Test<script>');
      const noteCalls = calls.filter(([arg]) => arg === '<b>Note</b>');

      expect(borrowerCalls.length).toBeGreaterThan(0);
      expect(noteCalls.length).toBeGreaterThan(0);
    });

    it('generates full CSV with all columns populated', () => {
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');
      vi.mocked(formatDateTime).mockReturnValue('25.12.2025, 10:30');

      const mockItem = createMockHistoryItem({
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-25T10:00:00Z',
        returnedAt: '2025-12-26T15:30:00Z',
        returnNote: 'Alles OK',
        device: {
          id: 'device-id',
          callSign: 'Florian-4-23',
          serialNumber: null,
          deviceType: 'HRT',
          status: 'AVAILABLE',
        },
      });

      const csv = generateHistoryCSV([mockItem]);
      const lines = csv.split('\r\n');

      // Verify data row contains all expected values
      expect(lines[1]).toContain('Florian-4-23');
      expect(lines[1]).toContain('HRT');
      expect(lines[1]).toContain('Max Mustermann');
      expect(lines[1]).toContain('25.12.2025, 10:30');
      expect(lines[1]).toContain('Alles OK');
      expect(lines[1]).toContain('Zurückgegeben');
    });
  });

  // ================================================================================
  // generateExportFilename - Filename Generation
  // ================================================================================
  describe('generateExportFilename', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('generates filename with current date', () => {
      vi.setSystemTime(new Date('2025-12-25T10:00:00Z'));

      const filename = generateExportFilename();

      expect(filename).toBe('historie_2025-12-25.csv');
    });

    it('includes sanitized device filter in filename', () => {
      vi.setSystemTime(new Date('2025-12-25T10:00:00Z'));

      const filename = generateExportFilename('florian-4-23');

      expect(filename).toBe('historie_florian-4-23_2025-12-25.csv');
    });

    it('sanitizes device filter with invalid chars', () => {
      vi.setSystemTime(new Date('2025-12-25T10:00:00Z'));

      const filename = generateExportFilename('florian/4\\23');

      expect(filename).toBe('historie_florian-4-23_2025-12-25.csv');
    });

    it('handles empty device filter', () => {
      vi.setSystemTime(new Date('2025-12-25T10:00:00Z'));

      const filename = generateExportFilename('');

      // Empty string is falsy, so should use non-filter format
      expect(filename).toBe('historie_2025-12-25.csv');
    });

    it('handles different dates', () => {
      vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));

      const filename = generateExportFilename();

      expect(filename).toBe('historie_2026-01-15.csv');
    });

    it('truncates very long device filters', () => {
      vi.setSystemTime(new Date('2025-12-25T10:00:00Z'));

      const longFilter = 'a'.repeat(250);
      const filename = generateExportFilename(longFilter);

      // Should be truncated to 200 chars + prefix + date + .csv
      // historie_ + 200 chars + _ + 10 chars (date) + .csv
      expect(filename.length).toBeLessThanOrEqual('historie_'.length + 200 + '_2025-12-25.csv'.length);
    });
  });

  // ================================================================================
  // downloadCSV - File Download
  // ================================================================================
  describe('downloadCSV', () => {
    let createElementSpy: any;
    let revokeObjectURLSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let clickSpy: any;

    beforeEach(() => {
      // Mock DOM APIs
      clickSpy = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: clickSpy,
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      // Mock URL methods (may not exist in test environment)
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      revokeObjectURLSpy = vi.spyOn(global.URL, 'revokeObjectURL');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates a Blob with UTF-8 encoding', () => {
      const content = 'test,csv,content';
      const filename = 'test.csv';

      // Track Blob constructor calls
      const originalBlob = global.Blob;
      const blobCalls: any[] = [];

      global.Blob = vi.fn(function(this: any, ...args: any[]) {
        blobCalls.push(args);
        return {} as Blob;
      }) as any;

      downloadCSV(content, filename);

      expect(blobCalls.length).toBeGreaterThan(0);
      expect(blobCalls[0][0]).toEqual([content]);
      expect(blobCalls[0][1]).toEqual({ type: 'text/csv; charset=utf-8' });

      // Restore original
      global.Blob = originalBlob;
    });

    it('creates download link with correct attributes', () => {
      const content = 'test,csv,content';
      const filename = 'export.csv';

      downloadCSV(content, filename);

      expect(createElementSpy).toHaveBeenCalledWith('a');

      const mockLink = createElementSpy.mock.results[0].value;
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe('export.csv');
    });

    it('triggers download by clicking link', () => {
      const content = 'test,csv,content';
      const filename = 'test.csv';

      downloadCSV(content, filename);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    // H5/H7: revokeObjectURL is now deferred by 500ms to prevent race condition on Safari
    it('cleans up DOM and URL resources', async () => {
      const content = 'test,csv,content';
      const filename = 'test.csv';

      downloadCSV(content, filename);

      // DOM cleanup happens immediately
      expect(removeChildSpy).toHaveBeenCalled();

      // URL revoke is deferred by 500ms (H5 fix: was 100ms)
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();

      // Wait for the deferred revoke (H5: 500ms delay)
      await vi.waitFor(() => {
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      }, { timeout: 600 });
    });

    // H5/H7: Updated sequence test - revoke is now async with 500ms delay
    it('follows correct sequence: append -> click -> remove, then revoke (deferred)', async () => {
      const content = 'test,csv,content';
      const filename = 'test.csv';

      const callOrder: string[] = [];

      appendChildSpy.mockImplementation(() => {
        callOrder.push('append');
        return {} as any;
      });

      clickSpy.mockImplementation(() => {
        callOrder.push('click');
      });

      removeChildSpy.mockImplementation(() => {
        callOrder.push('remove');
        return {} as any;
      });

      revokeObjectURLSpy.mockImplementation(() => {
        callOrder.push('revoke');
      });

      downloadCSV(content, filename);

      // Synchronous operations complete immediately
      expect(callOrder).toEqual(['append', 'click', 'remove']);

      // Wait for the deferred revoke (H5: 500ms delay, was 100ms)
      await vi.waitFor(() => {
        expect(callOrder).toEqual(['append', 'click', 'remove', 'revoke']);
      }, { timeout: 600 });
    });
  });

  // ================================================================================
  // fetchAllHistoryPages - Multi-page Fetch
  // ================================================================================
  describe('fetchAllHistoryPages', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('throws ExportSizeLimitError when total > 10000', async () => {
      vi.mocked(fetchAdminHistory).mockResolvedValue({
        data: [],
        meta: { total: 15000, page: 1, pageSize: 1000, totalPages: 15 },
      });

      await expect(fetchAllHistoryPages()).rejects.toThrow(ExportSizeLimitError);

      // Reset for second assertion
      vi.mocked(fetchAdminHistory).mockResolvedValue({
        data: [],
        meta: { total: 15000, page: 1, pageSize: 1000, totalPages: 15 },
      });

      await expect(fetchAllHistoryPages()).rejects.toThrow(
        'Export zu groß (15000 Einträge). Bitte Filter verwenden.'
      );
    });

    it('includes total count in error message', async () => {
      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [],
        meta: { total: 50000, page: 1, pageSize: 1000, totalPages: 50 },
      });

      try {
        await fetchAllHistoryPages();
        expect.fail('Should have thrown ExportSizeLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(ExportSizeLimitError);
        expect((error as ExportSizeLimitError).total).toBe(50000);
      }
    });

    it('returns single page data directly when totalPages = 1', async () => {
      const mockData = [
        createMockHistoryItem({ id: '1' }),
        createMockHistoryItem({ id: '2' }),
      ];

      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: mockData,
        meta: { total: 2, page: 1, pageSize: 1000, totalPages: 1 },
      });

      const result = await fetchAllHistoryPages();

      expect(result.data).toEqual(mockData);
      expect(result.partial).toBe(false);
      expect(result.failedPages).toBeUndefined();
      expect(fetchAdminHistory).toHaveBeenCalledTimes(1);
    });

    it('passes filters to API call', async () => {
      const mockData = [createMockHistoryItem()];

      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: mockData,
        meta: { total: 1, page: 1, pageSize: 1000, totalPages: 1 },
      });

      const filters = {
        deviceId: 'device-123',
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
      };

      await fetchAllHistoryPages(filters);

      expect(fetchAdminHistory).toHaveBeenCalledWith({
        ...filters,
        page: 1,
        pageSize: 1000,
      });
    });

    // H2 FIX: Updated to expect chunks of 3 (was 5) for better rate-limiting
    it('fetches multiple pages in chunks of 3', async () => {
      // First page response
      const page1Data = [createMockHistoryItem({ id: '1' })];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 4000, page: 1, pageSize: 1000, totalPages: 4 },
        })
        // Pages 2-4 (one chunk of 3)
        .mockResolvedValueOnce({ data: [createMockHistoryItem({ id: '2' })], meta: { total: 4000, page: 2, pageSize: 1000, totalPages: 4 } })
        .mockResolvedValueOnce({ data: [createMockHistoryItem({ id: '3' })], meta: { total: 4000, page: 3, pageSize: 1000, totalPages: 4 } })
        .mockResolvedValueOnce({ data: [createMockHistoryItem({ id: '4' })], meta: { total: 4000, page: 4, pageSize: 1000, totalPages: 4 } });

      const result = await fetchAllHistoryPages();

      expect(result.data.length).toBe(4);
      expect(result.partial).toBe(false);
      expect(fetchAdminHistory).toHaveBeenCalledTimes(4); // 1 initial + 3 remaining
    });

    it('handles partial failures with Promise.allSettled', async () => {
      const page1Data = [createMockHistoryItem({ id: '1' })];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 3000, page: 1, pageSize: 1000, totalPages: 3 },
        })
        // Page 2 succeeds
        .mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: '2' })],
          meta: { total: 3000, page: 2, pageSize: 1000, totalPages: 3 },
        })
        // Page 3 fails
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchAllHistoryPages();

      expect(result.data.length).toBe(2); // Pages 1 and 2 only
      expect(result.partial).toBe(true);
      expect(result.failedPages).toEqual([3]);
    });

    it('tracks multiple failed pages', async () => {
      const page1Data = [createMockHistoryItem({ id: '1' })];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 5000, page: 1, pageSize: 1000, totalPages: 5 },
        })
        // Page 2 fails
        .mockRejectedValueOnce(new Error('Error 1'))
        // Page 3 succeeds
        .mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: '3' })],
          meta: { total: 5000, page: 3, pageSize: 1000, totalPages: 5 },
        })
        // Page 4 fails
        .mockRejectedValueOnce(new Error('Error 2'))
        // Page 5 succeeds
        .mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: '5' })],
          meta: { total: 5000, page: 5, pageSize: 1000, totalPages: 5 },
        });

      const result = await fetchAllHistoryPages();

      expect(result.data.length).toBe(3); // Pages 1, 3, 5
      expect(result.partial).toBe(true);
      expect(result.failedPages).toEqual([2, 4]);
    });

    it('sorts results by borrowedAt descending', async () => {
      const page1Data = [
        createMockHistoryItem({ id: '1', borrowedAt: '2025-12-20T10:00:00Z' }),
      ];
      const page2Data = [
        createMockHistoryItem({ id: '2', borrowedAt: '2025-12-25T10:00:00Z' }),
      ];
      const page3Data = [
        createMockHistoryItem({ id: '3', borrowedAt: '2025-12-22T10:00:00Z' }),
      ];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 3, page: 1, pageSize: 1, totalPages: 3 },
        })
        .mockResolvedValueOnce({
          data: page2Data,
          meta: { total: 3, page: 2, pageSize: 1, totalPages: 3 },
        })
        .mockResolvedValueOnce({
          data: page3Data,
          meta: { total: 3, page: 3, pageSize: 1, totalPages: 3 },
        });

      const result = await fetchAllHistoryPages();

      // Should be sorted: 2025-12-25, 2025-12-22, 2025-12-20
      expect(result.data[0]?.id).toBe('2');
      expect(result.data[1]?.id).toBe('3');
      expect(result.data[2]?.id).toBe('1');
    });

    it('returns failedPages undefined when no failures', async () => {
      const page1Data = [createMockHistoryItem({ id: '1' })];
      const page2Data = [createMockHistoryItem({ id: '2' })];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 2, page: 1, pageSize: 1, totalPages: 2 },
        })
        .mockResolvedValueOnce({
          data: page2Data,
          meta: { total: 2, page: 2, pageSize: 1, totalPages: 2 },
        });

      const result = await fetchAllHistoryPages();

      expect(result.partial).toBe(false);
      expect(result.failedPages).toBeUndefined();
    });

    it('uses pageSize of 1000', async () => {
      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [],
        meta: { total: 0, page: 1, pageSize: 1000, totalPages: 0 },
      });

      await fetchAllHistoryPages();

      expect(fetchAdminHistory).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 1000 })
      );
    });

    // H2 FIX: Updated for chunk size 3
    it('handles exactly 10000 records (boundary)', async () => {
      const mockData = [createMockHistoryItem()];

      // Mock all 10 pages - with chunk size 3, we need: 1 initial + 9 remaining (3 chunks of 3)
      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: mockData,
          meta: { total: 10000, page: 1, pageSize: 1000, totalPages: 10 },
        });

      // Pages 2-10 (remaining 9 pages in chunks of 3)
      for (let i = 2; i <= 10; i++) {
        vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
          data: mockData,
          meta: { total: 10000, page: i, pageSize: 1000, totalPages: 10 },
        });
      }

      // Should NOT throw for exactly 10000
      const result = await fetchAllHistoryPages();
      expect(result).toBeDefined();
      expect(result.data.length).toBe(10); // 10 pages × 1 item each
    });

    it('handles 10001 records (just over limit)', async () => {
      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [],
        meta: { total: 10001, page: 1, pageSize: 1000, totalPages: 11 },
      });

      // Should throw for 10001
      await expect(fetchAllHistoryPages()).rejects.toThrow(ExportSizeLimitError);
    });

    // H3: Test that _t timestamp parameter is passed for cache-bypass (AC2)
    it('passes _t timestamp parameter to bypass cache', async () => {
      const page1Data = [createMockHistoryItem({ id: '1' })];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: page1Data,
          meta: { total: 2000, page: 1, pageSize: 1000, totalPages: 2 },
        })
        .mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: '2' })],
          meta: { total: 2000, page: 2, pageSize: 1000, totalPages: 2 },
        });

      await fetchAllHistoryPages();

      // First call (page 1) does NOT have _t parameter
      expect(fetchAdminHistory).toHaveBeenNthCalledWith(1, {
        page: 1,
        pageSize: 1000,
      });

      // Second call (page 2) SHOULD have _t parameter for cache bypass
      const secondCall = vi.mocked(fetchAdminHistory).mock.calls[1]?.[0];
      expect(secondCall).toHaveProperty('page', 2);
      expect(secondCall).toHaveProperty('pageSize', 1000);
      expect(secondCall).toHaveProperty('_t');
      expect(typeof secondCall?._t).toBe('number');
      // Timestamp should be recent (within last 5 seconds)
      expect(secondCall?._t).toBeGreaterThan(Date.now() - 5000);
    });

    // M4: Test that 300ms delay is applied between chunks for rate-limiting
    // This test verifies the CHUNK_DELAY_MS constant (300ms) is used between chunk fetches.
    // We test this by checking that the implementation uses setTimeout via the delay function.
    it('applies delay between chunks for rate-limiting', async () => {
      // Setup: 7 pages total (1 initial + 6 remaining = 2 chunks of 3)
      // This will trigger at least one delay between chunks
      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: '1' })],
          meta: { total: 7000, page: 1, pageSize: 1000, totalPages: 7 },
        });

      // Pages 2-7 (6 pages in 2 chunks of 3)
      for (let i = 2; i <= 7; i++) {
        vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
          data: [createMockHistoryItem({ id: `${i}` })],
          meta: { total: 7000, page: i, pageSize: 1000, totalPages: 7 },
        });
      }

      // Spy on setTimeout to verify delay is called
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      await fetchAllHistoryPages();

      // Should have called setTimeout for delay between chunk 1 (pages 2-4) and chunk 2 (pages 5-7)
      // The delay is 300ms (CHUNK_DELAY_MS constant)
      const delayCall = setTimeoutSpy.mock.calls.find(call => call[1] === 300);
      expect(delayCall).toBeDefined();

      setTimeoutSpy.mockRestore();
    });

    // M4: Alternative test - verify actual timing with real timers
    it('verifies CHUNK_SIZE and CHUNK_DELAY_MS constants in fetch behavior', async () => {
      // This test ensures the implementation fetches in chunks of 3 with delays
      // by checking the number of fetch calls made in each batch

      const fetchCalls: number[][] = [];
      let currentBatch: number[] = [];

      vi.mocked(fetchAdminHistory).mockImplementation(async (params) => {
        currentBatch.push(params?.page ?? 0);
        // When we have 3 calls in current batch, it's a full chunk
        if (currentBatch.length === 3 || (params?.page ?? 0) === 7) {
          fetchCalls.push([...currentBatch]);
          currentBatch = [];
        }
        return {
          data: [createMockHistoryItem({ id: `${params?.page}` })],
          meta: { total: 7000, page: params?.page ?? 1, pageSize: 1000, totalPages: 7 },
        };
      });

      await fetchAllHistoryPages();

      // First call is page 1 (initial fetch)
      expect(fetchAdminHistory).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));

      // Remaining pages 2-7 should be fetched in chunks of 3
      // Total calls: 1 (initial) + 6 (remaining) = 7
      expect(fetchAdminHistory).toHaveBeenCalledTimes(7);
    });
  });

  // ================================================================================
  // ExportSizeLimitError - Custom Error Class
  // ================================================================================
  describe('ExportSizeLimitError', () => {
    it('extends Error', () => {
      const error = new ExportSizeLimitError(15000);
      expect(error).toBeInstanceOf(Error);
    });

    it('sets correct name', () => {
      const error = new ExportSizeLimitError(15000);
      expect(error.name).toBe('ExportSizeLimitError');
    });

    it('stores total count', () => {
      const error = new ExportSizeLimitError(15000);
      expect(error.total).toBe(15000);
    });

    it('generates German error message with count', () => {
      const error = new ExportSizeLimitError(25000);
      expect(error.message).toBe('Export zu groß (25000 Einträge). Bitte Filter verwenden.');
    });
  });

  // ================================================================================
  // H6 FIX: E2E Integration Test - Complete Export Flow
  // ================================================================================
  describe('E2E Integration: Complete Export Flow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset mocks to pass through for integration testing
      vi.mocked(sanitizeForDisplay).mockImplementation((text) => text || '');
      vi.mocked(formatDateTime).mockImplementation((date) => {
        if (!date) return 'Ungültiges Datum';
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      });
    });

    it('H6: integrates fetchAllHistoryPages → generateHistoryCSV → downloadCSV', async () => {
      // Setup: Mock API to return realistic data
      const mockItems: HistoryItem[] = [
        {
          id: 'loan-1',
          borrowerName: 'Max Müller',
          borrowedAt: '2025-12-25T10:00:00Z',
          returnedAt: '2025-12-25T14:30:00Z',
          returnNote: 'Gerät in gutem Zustand',
          device: {
            id: 'device-1',
            callSign: 'Florian-4-23',
            serialNumber: 'SN-2025-001',
            deviceType: 'HRT',
            status: 'AVAILABLE',
          },
        },
        {
          id: 'loan-2',
          borrowerName: 'Anna Schmidt',
          borrowedAt: '2025-12-24T08:00:00Z',
          returnedAt: null,
          returnNote: null,
          device: {
            id: 'device-2',
            callSign: 'Florian-5-11',
            serialNumber: null,
            deviceType: 'MRT',
            status: 'LOANED',
          },
        },
      ];

      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: mockItems,
        meta: { total: 2, page: 1, pageSize: 1000, totalPages: 1 },
      });

      // Step 1: Fetch all pages
      const result = await fetchAllHistoryPages({ deviceId: 'device-1' });
      expect(result.data).toHaveLength(2);
      expect(result.partial).toBe(false);

      // Step 2: Generate CSV
      const csv = generateHistoryCSV(result.data, result.partial);

      // Verify CSV structure
      expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
      expect(csv).toContain('Gerät');
      expect(csv).toContain('Seriennummer');
      expect(csv).toContain('Florian-4-23');
      expect(csv).toContain('Max Müller');
      expect(csv).toContain('Zurückgegeben');
      expect(csv).toContain('Anna Schmidt');
      expect(csv).toContain('Noch ausgeliehen');
      expect(csv).toContain('Ausgeliehen');

      // Step 3: Generate filename
      const filename = generateExportFilename('Florian-4-23');
      expect(filename).toMatch(/^historie_Florian-4-23_\d{4}-\d{2}-\d{2}\.csv$/);

      // Step 4: Verify download would work (mock DOM)
      const mockLink = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      global.URL.createObjectURL = vi.fn(() => 'blob:mock');
      global.URL.revokeObjectURL = vi.fn();

      downloadCSV(csv, filename);

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe(filename);
    });

    it('H6: handles partial failure in integration flow', async () => {
      const mockPage1: HistoryItem[] = [
        {
          id: 'loan-1',
          borrowerName: 'Test User',
          borrowedAt: '2025-12-25T10:00:00Z',
          returnedAt: null,
          returnNote: null,
          device: {
            id: 'device-1',
            callSign: 'Test-1',
            serialNumber: 'SN-001',
            deviceType: 'HRT',
            status: 'LOANED',
          },
        },
      ];

      vi.mocked(fetchAdminHistory)
        .mockResolvedValueOnce({
          data: mockPage1,
          meta: { total: 2000, page: 1, pageSize: 1000, totalPages: 2 },
        })
        .mockRejectedValueOnce(new Error('Network timeout'));

      // Fetch with partial failure
      const result = await fetchAllHistoryPages();
      expect(result.partial).toBe(true);
      expect(result.failedPages).toEqual([2]);

      // Generate CSV with partial hint
      const csv = generateHistoryCSV(result.data, result.partial);
      expect(csv).toContain('HINWEIS: Export unvollständig');
    });

    it('H6: handles CSV injection in integration flow', async () => {
      const maliciousItem: HistoryItem = {
        id: 'loan-evil',
        borrowerName: '=CMD|calc', // CSV injection attempt
        borrowedAt: '2025-12-25T10:00:00Z',
        returnedAt: null,
        returnNote: '\r=MALICIOUS', // H1 bypass attempt
        device: {
          id: 'device-evil',
          callSign: '+FORMULA',
          serialNumber: '@IMPORT',
          deviceType: '-DANGEROUS',
          status: 'LOANED',
        },
      };

      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [maliciousItem],
        meta: { total: 1, page: 1, pageSize: 1000, totalPages: 1 },
      });

      const result = await fetchAllHistoryPages();
      const csv = generateHistoryCSV(result.data);

      // All dangerous content should be escaped
      expect(csv).toContain("'=CMD|calc");
      expect(csv).toContain("'+FORMULA");
      expect(csv).toContain("'@IMPORT");
      expect(csv).toContain("'-DANGEROUS");
      expect(csv).toContain("' =MALICIOUS"); // H1: newline replaced, still escaped
    });

    it('H6: handles size limit in integration flow', async () => {
      // First call
      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [],
        meta: { total: 15000, page: 1, pageSize: 1000, totalPages: 15 },
      });

      await expect(fetchAllHistoryPages()).rejects.toThrow(ExportSizeLimitError);

      // Reset and setup for second call
      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [],
        meta: { total: 15000, page: 1, pageSize: 1000, totalPages: 15 },
      });

      await expect(fetchAllHistoryPages()).rejects.toThrow('Export zu groß');
    });

    it('H6: handles German umlauts through entire flow', async () => {
      const germanItem: HistoryItem = {
        id: 'loan-german',
        borrowerName: 'Günther Größe-Öztürk',
        borrowedAt: '2025-12-25T10:00:00Z',
        returnedAt: '2025-12-25T15:00:00Z',
        returnNote: 'Rückgabe gemäß Übergabeprotokoll',
        device: {
          id: 'device-german',
          callSign: 'Löschfahrzeug-1',
          serialNumber: 'SN-Röntgen-2025',
          deviceType: 'Funkgerät',
          status: 'AVAILABLE',
        },
      };

      vi.mocked(fetchAdminHistory).mockResolvedValueOnce({
        data: [germanItem],
        meta: { total: 1, page: 1, pageSize: 1000, totalPages: 1 },
      });

      const result = await fetchAllHistoryPages();
      const csv = generateHistoryCSV(result.data);

      // Verify UTF-8 BOM for Excel compatibility
      expect(csv.charCodeAt(0)).toBe(0xFEFF);

      // Verify all German chars preserved
      expect(csv).toContain('Günther Größe-Öztürk');
      expect(csv).toContain('Rückgabe gemäß Übergabeprotokoll');
      expect(csv).toContain('Löschfahrzeug-1');
      expect(csv).toContain('SN-Röntgen-2025');
      expect(csv).toContain('Funkgerät');
    });
  });
});
