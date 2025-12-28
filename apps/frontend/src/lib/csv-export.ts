import type { HistoryItem } from '@radio-inventar/shared';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { formatDateTime } from '@/lib/formatters';
import { fetchAdminHistory, type HistoryQueryFilters } from '@/api/admin-history';

// ================================================================================
// Multi-page Fetch for CSV Export
// ================================================================================

export interface FetchAllPagesResult {
  data: HistoryItem[];
  partial: boolean;
  failedPages: number[] | undefined;
}

/**
 * Custom error for export size limit exceeded
 */
export class ExportSizeLimitError extends Error {
  constructor(public total: number) {
    super(`Export zu groß (${total} Einträge). Bitte Filter verwenden.`);
    this.name = 'ExportSizeLimitError';
  }
}

/**
 * Fetch all history pages with filters for CSV export
 * AC2: Export with active filters, all pages
 * AC10: Size limit (>10,000 = error)
 * AC11: Partial failure handling
 */
export async function fetchAllHistoryPages(
  filters?: Omit<HistoryQueryFilters, 'page' | 'pageSize'>
): Promise<FetchAllPagesResult> {
  // Fetch first page to get metadata
  const first = await fetchAdminHistory({
    ...filters,
    page: 1,
    pageSize: 1000
  });

  // AC10: Check size limit
  if (first.meta.total > 10000) {
    throw new ExportSizeLimitError(first.meta.total);
  }

  // Single page - return directly
  if (first.meta.totalPages <= 1) {
    return { data: first.data, partial: false, failedPages: undefined };
  }

  // Fetch remaining pages in parallel with rate limiting
  const pageNumbers = Array.from(
    { length: first.meta.totalPages - 1 },
    (_, i) => i + 2
  );

  let allData: HistoryItem[] = [...first.data];
  const failedPages: number[] = [];

  // H3 FIX: Add delay between chunk fetches to prevent rate-limiting race condition
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // H2 FIX: Reduce chunk size from 5 to 3 to prevent rate-limit issues
  // With 3 parallel requests and 300ms delay, we get ~10 req/sec which is safer
  const CHUNK_SIZE = 3;
  const CHUNK_DELAY_MS = 300;

  for (let i = 0; i < pageNumbers.length; i += CHUNK_SIZE) {
    // H2 FIX: Wait 300ms between chunks (was 100ms) to respect rate limits
    if (i > 0) {
      await delay(CHUNK_DELAY_MS);
    }

    const chunk = pageNumbers.slice(i, i + CHUNK_SIZE);

    // H4 FIX: Add timestamp to bypass React Query cache
    const timestamp = Date.now();
    const results = await Promise.allSettled(
      chunk.map(page =>
        fetchAdminHistory({ ...filters, page, pageSize: 1000, _t: timestamp })
      )
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        // H2 FIX: Use push(...) for in-place modification instead of concat
        // concat creates a new array on each iteration = O(n²) complexity
        allData.push(...result.value.data);
      } else {
        const pageNum = chunk[idx];
        if (pageNum !== undefined) {
          failedPages.push(pageNum);
        }
      }
    });
  }

  // Sort by borrowedAt descending
  // H6 FIX: Pre-compute timestamps to avoid creating 2 Date objects per comparison
  // This reduces O(n log n * 2) Date creations to O(n) for large datasets
  const timestampMap = new Map(allData.map(item => [item, new Date(item.borrowedAt).getTime()]));
  allData.sort((a, b) => (timestampMap.get(b) ?? 0) - (timestampMap.get(a) ?? 0));

  return {
    data: allData,
    partial: failedPages.length > 0,
    failedPages: failedPages.length > 0 ? failedPages : undefined
  };
}

// ================================================================================
// CSV Generation & Export
// ================================================================================

/**
 * Normalize Unicode fullwidth characters to ASCII equivalents.
 * Fullwidth chars can bypass naive regex checks: ＝ → =, ＋ → +, etc.
 *
 * OWASP CSV Injection: Attackers may use fullwidth Unicode chars to bypass
 * ASCII-only dangerous character detection.
 *
 * @param value - The string to normalize
 * @returns The normalized string with fullwidth chars converted to ASCII
 */
function normalizeFullwidth(value: string): string {
  // Map fullwidth dangerous chars to ASCII equivalents
  // Fullwidth range: U+FF01-U+FF5E maps to U+0021-U+007E (offset -0xFEE0)
  const fullwidthMap: Record<string, string> = {
    '＝': '=', // U+FF1D
    '＋': '+', // U+FF0B
    '－': '-', // U+FF0D (fullwidth hyphen-minus)
    '＠': '@', // U+FF20
    '｜': '|', // U+FF5C
    '\uFF09': '\t', // Fullwidth Tab - C1 fix
  };

  let result = value;
  for (const [fullwidth, ascii] of Object.entries(fullwidthMap)) {
    result = result.replaceAll(fullwidth, ascii);
  }
  return result;
}

/**
 * Escape CSV injection characters per OWASP guidelines.
 * Dangerous chars: = + - @ | TAB CR LF
 *
 * This function prevents CSV formula injection attacks by:
 * 1. Normalizing fullwidth Unicode chars (C4)
 * 2. Checking for dangerous chars BEFORE newline replacement (H1 fix)
 * 3. Replacing newlines with spaces
 * 4. Trimming result to catch edge cases like "\r=FORMULA" → " =FORMULA"
 * 5. Prefixing dangerous chars with single quote (at start OR after newline replacement)
 *
 * CRITICAL: Also checks for dangerous chars that appear mid-string after cell
 * concatenation in Excel (C2). While rare, some spreadsheet apps may interpret
 * formulas after delimiters.
 *
 * H1 FIX: Check dangerous chars BEFORE newline replacement to catch patterns like
 * "\r=MALICIOUS" which would become " =MALICIOUS" after replacement and bypass
 * the start-of-string check.
 *
 * @param value - The string value to escape
 * @returns The escaped value safe for CSV export
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
export function escapeCSVInjection(value: string): string {
  // Step 1: Normalize fullwidth Unicode chars (C4)
  const normalized = normalizeFullwidth(value);

  // Step 2: H1 FIX - Check for dangerous chars BEFORE newline replacement
  // Pattern: newline followed by dangerous char (e.g., "\r=FORMULA", "\n+MALICIOUS")
  const dangerousAfterNewline = /[\r\n][=+\-@|\t]/;
  const hasDangerousAfterNewline = dangerousAfterNewline.test(normalized);

  // Step 3: Check for dangerous chars at start BEFORE any transformation
  // This catches \ttab, =FORMULA, etc. before they could be modified
  const dangerousAtStart = /^[=+\-@|\t]/;
  const hasDangerousAtStart = dangerousAtStart.test(normalized);

  // Step 4: Replace newlines with spaces
  const sanitized = normalized.replace(/[\r\n]/g, ' ');

  // Step 5: H1 FIX - Also check trimmed version to catch " =FORMULA" after newline replacement
  // Note: We use custom trim that only removes spaces (not tabs) to preserve \t detection
  const trimmedSpacesOnly = sanitized.replace(/^ +| +$/g, '');

  // Step 6: Check for dangerous chars at start (most common attack vector)
  if (hasDangerousAtStart || hasDangerousAfterNewline || dangerousAtStart.test(trimmedSpacesOnly)) {
    return "'" + sanitized;
  }

  // Step 6: Check for dangerous chars after common delimiters (C2)
  // These patterns could be exploited in certain spreadsheet configurations
  // where cell content after ; or , is interpreted as a new cell
  const dangerousAfterDelimiter = /[;,][=+\-@|\t]/;
  if (dangerousAfterDelimiter.test(sanitized)) {
    // Escape by prefixing with single quote
    return "'" + sanitized;
  }

  return sanitized;
}

/**
 * Sanitize filename by removing invalid filesystem characters.
 * Replaces characters that are invalid in filenames across Windows, macOS, and Linux.
 *
 * @param name - The filename to sanitize
 * @returns The sanitized filename (max 200 characters)
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '-').substring(0, 200);
}

/**
 * Generate a CSV-safe field value with dual sanitization strategy:
 *
 * Step 1: sanitizeForDisplay() - XSS protection
 *   - Removes HTML tags
 *   - Normalizes whitespace
 *   - Prevents script injection
 *
 * Step 2: escapeCSVInjection() - CSV formula injection protection
 *   - Prefixes dangerous characters (=, +, -, @, |, TAB)
 *   - Prevents Excel/LibreOffice formula execution
 *
 * Step 3: CSV formatting
 *   - Doubles existing double quotes
 *   - Wraps value in double quotes
 *
 * @param value - The raw value to process
 * @returns A CSV-safe quoted field value
 */
function formatCSVField(value: string): string {
  // Step 1: XSS protection (H5 fix: null-guard for potential undefined return)
  const xssSafe = sanitizeForDisplay(value) ?? '';

  // Step 2: CSV injection protection
  const csvSafe = escapeCSVInjection(xssSafe);

  // Step 3: CSV formatting - escape quotes and wrap in quotes
  const escaped = csvSafe.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate CSV export content from history data.
 *
 * Features:
 * - UTF-8 BOM for German Excel compatibility
 * - Semicolon delimiter (German Excel standard)
 * - German column headers (8 columns per AC3)
 * - Dual sanitization: XSS + CSV injection protection
 * - CRLF line endings for Windows compatibility
 * - Null-guards for device fields (H8)
 *
 * @param data - Array of history items to export
 * @param addPartialHint - If true, adds a hint row at the end for partial exports (H2)
 * @returns CSV file content as string
 */
export function generateHistoryCSV(data: HistoryItem[], addPartialHint = false): string {
  // UTF-8 BOM for German Excel compatibility
  const BOM = '\uFEFF';

  // German column headers (8 columns per AC3)
  const headers = [
    'Gerät',
    'Seriennummer', // C1: Added serialNumber column
    'Gerätetyp',
    'Ausleiher',
    'Ausleihe-Datum',
    'Rückgabe-Datum',
    'Zustandsnotiz',
    'Status'
  ];

  // Build CSV rows
  const headerRow = headers.map(h => formatCSVField(h)).join(';');

  const dataRows = data.map(item => {
    // H8: Null-guards for device fields
    const callSign = item.device?.callSign ?? '-';
    const serialNumber = item.device?.serialNumber ?? '-'; // C1+C3: serialNumber with null fallback
    const deviceType = item.device?.deviceType ?? '-';
    const borrowerName = item.borrowerName ?? '-';

    const fields = [
      // Gerät (device.callSign)
      formatCSVField(callSign),

      // Seriennummer (device.serialNumber or "-") - C1+C3
      formatCSVField(serialNumber),

      // Gerätetyp (device.deviceType)
      formatCSVField(deviceType),

      // Ausleiher (borrowerName)
      formatCSVField(borrowerName),

      // Ausleihe-Datum (borrowedAt formatted as "dd.MM.yyyy, HH:mm")
      formatCSVField(formatDateTime(item.borrowedAt)),

      // Rückgabe-Datum (returnedAt or "Noch ausgeliehen")
      formatCSVField(item.returnedAt ? formatDateTime(item.returnedAt) : 'Noch ausgeliehen'),

      // Zustandsnotiz (returnNote or "-")
      formatCSVField(item.returnNote || '-'),

      // Status ("Ausgeliehen" or "Zurückgegeben")
      formatCSVField(item.returnedAt ? 'Zurückgegeben' : 'Ausgeliehen')
    ];

    return fields.join(';');
  });

  // H2: Add hint row for partial exports (AC11)
  const allRows = addPartialHint
    ? [...dataRows, formatCSVField('--- HINWEIS: Export unvollständig - nicht alle Daten konnten geladen werden ---') + ';'.repeat(7)]
    : dataRows;

  // Combine with CRLF line endings for Windows compatibility
  const csvContent = [headerRow, ...allRows].join('\r\n');

  return BOM + csvContent;
}

/**
 * Generate filename for CSV export.
 *
 * Format:
 * - Without filter: "historie_2025-12-25.csv"
 * - With filter: "historie_florian-4-23_2025-12-25.csv"
 *
 * @param deviceFilter - Optional device filter (e.g., call sign)
 * @returns Sanitized filename for the export
 */
export function generateExportFilename(deviceFilter?: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (deviceFilter) {
    const sanitizedFilter = sanitizeFilename(deviceFilter);
    return `historie_${sanitizedFilter}_${date}.csv`;
  }

  return `historie_${date}.csv`;
}

/**
 * Download CSV content as a file.
 *
 * Creates a Blob with UTF-8 encoding, generates a download link,
 * triggers the download, and cleans up resources.
 *
 * @param content - The CSV content to download
 * @param filename - The filename for the downloaded file
 */
export function downloadCSV(content: string, filename: string): void {
  // Create Blob with UTF-8 encoding
  const blob = new Blob([content], { type: 'text/csv; charset=utf-8' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup - remove link immediately
  document.body.removeChild(link);

  // H5 FIX: Defer URL.revokeObjectURL by 500ms (was 100ms)
  // Safari and slow devices need more time to start the download before URL is revoked
  // H1 NOTE: No clearTimeout needed - this is a one-shot timer that runs only once
  // per download and completes in 500ms. Not a memory leak concern.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 500);
}
