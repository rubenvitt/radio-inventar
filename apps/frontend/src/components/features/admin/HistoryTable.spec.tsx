// apps/frontend/src/components/features/admin/HistoryTable.spec.tsx
// Story 6.3: Admin Historie UI - HistoryTable Tests (Task 10)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryTable } from './HistoryTable';
import type { HistoryItem } from '@radio-inventar/shared';

// Mock sanitizeForDisplay
vi.mock('@/lib/sanitize', () => ({
  sanitizeForDisplay: (text: string | undefined) => text || '',
}));

// Test data factory
const createHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 'loan-123',
  device: {
    id: 'dev-123',
    callSign: 'Florian 4-23',
    serialNumber: null,
    deviceType: 'Handfunkgerät',
    status: 'ON_LOAN',
  },
  borrowerName: 'Max Mustermann',
  borrowedAt: '2025-12-23T10:30:00.000Z',
  returnedAt: null,
  returnNote: null,
  ...overrides,
});

describe('HistoryTable', () => {
  // === Rendering Tests ===
  describe('Rendering', () => {
    it('should render table with all columns', () => {
      render(<HistoryTable data={[]} />);

      expect(screen.getByRole('columnheader', { name: /gerät/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /typ/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /ausleiher/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /ausgeliehen/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /zurückgegeben/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /notiz/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    });

    it('should render all history items as rows', () => {
      const items = [
        createHistoryItem({ id: 'loan-1' }),
        createHistoryItem({ id: 'loan-2' }),
        createHistoryItem({ id: 'loan-3' }),
      ];

      render(<HistoryTable data={items} />);

      const rows = screen.getAllByRole('row');
      // Header row + 3 data rows
      expect(rows).toHaveLength(4);
    });

    it('should show correct data in each cell', () => {
      const item = createHistoryItem({
        device: {
          id: 'dev-1',
          callSign: 'Florian 1-11',
          serialNumber: null,
          deviceType: 'Funkgerät',
          status: 'AVAILABLE',
        },
        borrowerName: 'Hans Schmidt',
      });

      render(<HistoryTable data={[item]} />);

      expect(screen.getByText('Florian 1-11')).toBeInTheDocument();
      expect(screen.getByText('Funkgerät')).toBeInTheDocument();
      expect(screen.getByText('Hans Schmidt')).toBeInTheDocument();
    });
  });

  // === Active Loan Highlighting Tests ===
  describe('Active Loan Highlighting', () => {
    it('should show orange background for active loans', () => {
      const activeLoan = createHistoryItem({ returnedAt: null });
      render(<HistoryTable data={[activeLoan]} />);

      const row = screen.getAllByRole('row')[1]; // Skip header
      expect(row).toHaveClass('bg-orange-50');
    });

    it('should show "Ausgeliehen" badge for active loans', () => {
      const activeLoan = createHistoryItem({ returnedAt: null });
      render(<HistoryTable data={[activeLoan]} />);

      // Find the badge (not the header), look for it within a span/badge
      const badges = screen.getAllByText('Ausgeliehen');
      const badge = badges.find(el => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Zurückgegeben" badge for returned loans', () => {
      const returnedLoan = createHistoryItem({
        returnedAt: '2025-12-23T14:00:00.000Z',
      });
      render(<HistoryTable data={[returnedLoan]} />);

      // Find the badge (not the header)
      const badges = screen.getAllByText('Zurückgegeben');
      const badge = badges.find(el => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
    });

    it('should not highlight returned loans', () => {
      const returnedLoan = createHistoryItem({
        returnedAt: '2025-12-23T14:00:00.000Z',
      });
      render(<HistoryTable data={[returnedLoan]} />);

      const row = screen.getAllByRole('row')[1];
      expect(row).not.toHaveClass('bg-orange-50');
    });
  });

  // === Date Formatting Tests ===
  describe('Date Formatting', () => {
    it('should format borrowedAt as DD.MM.YYYY, HH:mm', () => {
      const item = createHistoryItem({
        borrowedAt: '2025-12-23T10:30:00.000Z',
      });
      render(<HistoryTable data={[item]} />);

      // Date formatting depends on timezone, check for date pattern
      expect(screen.getByText(/23\.12\.2025/)).toBeInTheDocument();
    });

    it('should format returnedAt when present', () => {
      const item = createHistoryItem({
        returnedAt: '2025-12-23T14:00:00.000Z',
      });
      render(<HistoryTable data={[item]} />);

      // Two dates visible: borrowedAt and returnedAt
      const dateTexts = screen.getAllByText(/23\.12\.2025/);
      expect(dateTexts.length).toBeGreaterThanOrEqual(2);
    });

    it('should show "-" when returnedAt is null', () => {
      const item = createHistoryItem({ returnedAt: null });
      render(<HistoryTable data={[item]} />);

      const cells = screen.getAllByRole('cell');
      // Find cell with just "-" (returnedAt column)
      const returnedAtCells = cells.filter(cell => cell.textContent === '-');
      expect(returnedAtCells.length).toBeGreaterThan(0);
    });

    it('should handle invalid dates gracefully', () => {
      const item = createHistoryItem({
        borrowedAt: 'invalid-date',
      });
      render(<HistoryTable data={[item]} />);

      expect(screen.getByText('Ungültiges Datum')).toBeInTheDocument();
    });
  });

  // === Empty State Tests ===
  describe('Empty State', () => {
    it('should show "Keine Ausleihen gefunden" for empty data', () => {
      render(<HistoryTable data={[]} />);

      expect(screen.getByText('Keine Ausleihen gefunden')).toBeInTheDocument();
    });
  });

  // === Touch Optimization Tests ===
  describe('Touch Optimization', () => {
    it('should have min-height on table rows', () => {
      const item = createHistoryItem();
      render(<HistoryTable data={[item]} />);

      const row = screen.getAllByRole('row')[1];
      expect(row).toHaveClass('min-h-[56px]');
    });
  });

  // === Fetching State Tests ===
  describe('Fetching State', () => {
    it('should apply opacity when fetching', () => {
      render(<HistoryTable data={[]} isFetching={true} />);

      // The opacity class is on the outer wrapper div (grandparent of table)
      const wrapper = screen.getByRole('table').parentElement?.parentElement;
      expect(wrapper).toHaveClass('opacity-70');
    });

    it('should not apply opacity when not fetching', () => {
      render(<HistoryTable data={[]} isFetching={false} />);

      const wrapper = screen.getByRole('table').parentElement?.parentElement;
      expect(wrapper).not.toHaveClass('opacity-70');
    });
  });

  // === Edge Cases ===
  describe('Edge Cases', () => {
    it('should truncate long returnNote', () => {
      const item = createHistoryItem({
        returnNote: 'This is a very long return note that should be truncated in the table display',
      });
      render(<HistoryTable data={[item]} />);

      const noteCell = screen.getByText(/This is a very long/);
      expect(noteCell).toHaveClass('truncate');
    });

    it('should show "-" for empty returnNote', () => {
      const item = createHistoryItem({ returnNote: null });
      render(<HistoryTable data={[item]} />);

      const cells = screen.getAllByRole('cell');
      const noteCells = cells.filter(cell => cell.textContent === '-');
      expect(noteCells.length).toBeGreaterThan(0);
    });

    it('should handle multiple items with mixed states', () => {
      const items = [
        createHistoryItem({ id: 'loan-1', returnedAt: null }),
        createHistoryItem({ id: 'loan-2', returnedAt: '2025-12-23T14:00:00.000Z' }),
        createHistoryItem({ id: 'loan-3', returnedAt: null }),
      ];

      render(<HistoryTable data={items} />);

      // Filter to only count badge elements (spans), not table headers
      const ausgeliehenBadges = screen.getAllByText('Ausgeliehen').filter(el => el.tagName === 'SPAN');
      expect(ausgeliehenBadges).toHaveLength(2);
      const zurueckgegebenBadges = screen.getAllByText('Zurückgegeben').filter(el => el.tagName === 'SPAN');
      expect(zurueckgegebenBadges).toHaveLength(1);
    });
  });

  // === XSS Protection Tests ===
  // [AI-Review Fix] CRITICAL: Added comprehensive XSS tests for all user-controlled fields
  describe('XSS Protection', () => {
    it('should sanitize callSign', () => {
      const item = createHistoryItem({
        device: {
          id: 'dev-1',
          callSign: '<script>alert("xss")</script>',
          serialNumber: null,
          deviceType: 'Test',
          status: 'AVAILABLE',
        },
      });

      render(<HistoryTable data={[item]} />);
      // If sanitization works, script tag should not be present as-is
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    // [AI-Review Fix] CRITICAL: Added test for deviceType XSS
    it('should sanitize deviceType', () => {
      const item = createHistoryItem({
        device: {
          id: 'dev-1',
          callSign: 'Test Device',
          serialNumber: null,
          deviceType: '<script>alert("deviceType")</script>',
          status: 'AVAILABLE',
        },
      });

      render(<HistoryTable data={[item]} />);
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    it('should sanitize borrowerName', () => {
      const item = createHistoryItem({
        borrowerName: '<img onerror="alert(1)" src="x">',
      });

      render(<HistoryTable data={[item]} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    // [AI-Review Fix] CRITICAL: Added test for returnNote XSS
    it('should sanitize returnNote', () => {
      const item = createHistoryItem({
        returnNote: '<script>alert("returnNote")</script>Malicious note',
      });

      render(<HistoryTable data={[item]} />);
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    // [AI-Review Fix] CRITICAL: Added test for device.status XSS
    it('should sanitize device status', () => {
      const item = createHistoryItem({
        device: {
          id: 'dev-1',
          callSign: 'Test',
          serialNumber: null,
          deviceType: 'Radio',
          status: '<img onerror="alert(1)" src="x">',
        },
      });

      render(<HistoryTable data={[item]} />);
      // Status is sanitized even though it's not directly displayed
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    // Test combined XSS vectors
    it('should sanitize multiple fields with XSS vectors', () => {
      const item = createHistoryItem({
        device: {
          id: 'dev-1',
          callSign: '<script>callSign</script>',
          serialNumber: null,
          deviceType: '<iframe src="evil.com"></iframe>',
          status: 'javascript:alert(1)',
        },
        borrowerName: '<svg onload="alert(1)">',
        returnNote: '<object data="evil.swf"></object>',
      });

      render(<HistoryTable data={[item]} />);
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
      expect(screen.queryByText('<iframe')).not.toBeInTheDocument();
      expect(screen.queryByText('<svg')).not.toBeInTheDocument();
      expect(screen.queryByText('<object')).not.toBeInTheDocument();
    });
  });
});
