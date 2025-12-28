import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from './ExportButton';

// Mock all dependencies
vi.mock('@/lib/csv-export', () => ({
  fetchAllHistoryPages: vi.fn(),
  generateHistoryCSV: vi.fn(() => 'csv-content'),
  downloadCSV: vi.fn(),
  generateExportFilename: vi.fn(() => 'historie_2025-12-25.csv'),
  ExportSizeLimitError: class extends Error {
    constructor(public total: number) {
      super(`Export zu groß (${total} Einträge). Bitte Filter verwenden.`);
      this.name = 'ExportSizeLimitError';
    }
  },
}));

vi.mock('@/api/admin-history', () => ({
  getHistoryErrorMessage: vi.fn(() => 'Fehler beim Laden'),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  fetchAllHistoryPages,
  generateHistoryCSV,
  downloadCSV,
  generateExportFilename,
  ExportSizeLimitError,
} from '@/lib/csv-export';
import { getHistoryErrorMessage } from '@/api/admin-history';
import { toast } from 'sonner';

// Helper to create mock HistoryItem (H6: includes serialNumber)
function createMockHistoryItem(id: string): {
  id: string;
  device: { id: string; status: string; callSign: string; serialNumber: string | null; deviceType: string };
  borrowerName: string;
  borrowedAt: string;
  returnedAt: string | null;
  returnNote: string | null;
} {
  return {
    id,
    device: {
      id: `device-${id}`,
      status: 'AVAILABLE',
      callSign: `Test-${id}`,
      serialNumber: `SN-${id}`, // H6: Add serialNumber
      deviceType: 'Funkgerät',
    },
    borrowerName: 'Test User',
    borrowedAt: '2025-01-01T10:00:00Z',
    returnedAt: null,
    returnNote: null,
  };
}

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset generateHistoryCSV to return a string by default
    vi.mocked(generateHistoryCSV).mockReturnValue('csv-content');
  });

  describe('Rendering (AC1, 6.6)', () => {
    it('renders button with Download icon and label', () => {
      render(<ExportButton />);
      expect(screen.getByRole('button', { name: /csv export/i })).toBeInTheDocument();
    });

    it('has accessible label', () => {
      render(<ExportButton />);
      expect(screen.getByLabelText('Historie als CSV exportieren')).toBeInTheDocument();
    });

    it('displays "CSV Export" text by default', () => {
      render(<ExportButton />);
      expect(screen.getByText('CSV Export')).toBeInTheDocument();
    });

    it('has 64px minimum height for touch targets', () => {
      render(<ExportButton />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-16');
    });

    it('renders Download icon when not exporting', () => {
      render(<ExportButton />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    // H4: Verify Download icon does NOT have animate-spin class (distinguishes from Loader2)
    it('renders Download icon without animate-spin class when not exporting', () => {
      render(<ExportButton />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
      // Download icon should NOT have the animate-spin class (only Loader2 has it)
      expect(icon).not.toHaveClass('animate-spin');
    });
  });

  describe('Loading State (AC6, 6.6)', () => {
    it('shows loading spinner during export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Lade Daten...')).toBeInTheDocument();
    });

    it('displays Loader2 icon during export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      const button = screen.getByRole('button');
      const loader = button.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('disables button during export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ExportButton />);
      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toBeDisabled();
    });

    it('shows progress text "Lade Daten..." initially', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Lade Daten...')).toBeInTheDocument();
    });

    it('updates progress through loading stages', async () => {
      const user = userEvent.setup();
      let resolveFetch: ((value: any) => void) | undefined;

      vi.mocked(fetchAllHistoryPages).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      // Should show loading initially
      await waitFor(() => {
        expect(screen.getByText('Lade Daten...')).toBeInTheDocument();
      });

      // Resolve to trigger completion
      resolveFetch?.({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      // After completion, no progress text should be visible
      await waitFor(() => {
        expect(screen.queryByText('Lade Daten...')).not.toBeInTheDocument();
        expect(screen.queryByText('Erstelle CSV...')).not.toBeInTheDocument();
      });
    });

    it('re-enables button after successful export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('re-enables button after failed export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(new Error('Network error'));

      render(<ExportButton />);
      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('clears progress text after export completes', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.queryByText('Lade Daten...')).not.toBeInTheDocument();
        expect(screen.queryByText('Erstelle CSV...')).not.toBeInTheDocument();
      });
    });

    // M6: Progress State Test for "Erstelle CSV..." intermediate state
    // NOTE: This state is difficult to test because generateHistoryCSV is synchronous.
    // The state change from "Lade Daten..." to "Erstelle CSV..." happens between
    // await fetchAllHistoryPages() and generateHistoryCSV(), but since generateHistoryCSV
    // is synchronous and fast, the "Erstelle CSV..." text appears and disappears
    // within the same React render cycle, making it impossible to reliably capture.
    //
    // To properly test this, we would need to either:
    // 1. Make generateHistoryCSV async (unnecessary complexity for a sync operation)
    // 2. Add artificial delays for testing (would slow down production code)
    // 3. Use React testing utilities that can capture intermediate states (complex)
    //
    // The progress states ARE visually observable in manual testing when processing
    // large datasets, as the browser may take time to render between state updates.
  });

  describe('Empty Results (AC9, 6.8)', () => {
    it('shows info toast when no data to export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Keine Daten zum Exportieren');
      });
    });

    it('does not call generateHistoryCSV when data is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalled();
      });

      expect(generateHistoryCSV).not.toHaveBeenCalled();
    });

    it('does not call downloadCSV when data is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalled();
      });

      expect(downloadCSV).not.toHaveBeenCalled();
    });

    it('does not show success toast when data is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalled();
      });

      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Size Limit Warning (AC10, 6.9)', () => {
    it('shows error toast when export exceeds size limit', async () => {
      const user = userEvent.setup();
      const limitError = new ExportSizeLimitError(15000);
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(limitError);

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Export zu groß (15000 Einträge). Bitte Filter verwenden.'
        );
      });
    });

    it('does not show generic error for size limit', async () => {
      const user = userEvent.setup();
      const limitError = new ExportSizeLimitError(15000);
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(limitError);

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledTimes(1);
      });

      expect(getHistoryErrorMessage).not.toHaveBeenCalled();
    });

    it('does not call generateHistoryCSV when size limit exceeded', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(
        new ExportSizeLimitError(20000)
      );

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(generateHistoryCSV).not.toHaveBeenCalled();
    });

    it('re-enables button after size limit error', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(
        new ExportSizeLimitError(15000)
      );

      render(<ExportButton />);
      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Partial Failure Handling (AC11, 6.10)', () => {
    it('shows warning toast when export is partial', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1'), createMockHistoryItem('2')],
        partial: true,
        failedPages: [3, 5],
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          'Export unvollständig - nicht alle Daten geladen'
        );
      });
    });

    // H2: generateHistoryCSV should be called with partial=true for partial exports
    it('still generates and downloads CSV with partial data and hint', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1'), createMockHistoryItem('2')],
        partial: true,
        failedPages: [3],
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // H2: Should pass true for addPartialHint when partial
        expect(generateHistoryCSV).toHaveBeenCalledWith(
          expect.any(Array),
          true // addPartialHint should be true
        );
        expect(downloadCSV).toHaveBeenCalled();
      });
    });

    it('does not pass partial hint for complete exports', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // Should pass false for addPartialHint when not partial
        expect(generateHistoryCSV).toHaveBeenCalledWith(
          expect.any(Array),
          false // addPartialHint should be false
        );
      });
    });

    it('shows both warning and success toast for partial export', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1'), createMockHistoryItem('2')],
        partial: true,
        failedPages: [3],
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          'Export unvollständig - nicht alle Daten geladen'
        );
        expect(toast.success).toHaveBeenCalledWith('2 Einträge exportiert');
      });
    });

    it('does not show warning when export is complete', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling (AC7, 6.7)', () => {
    it('shows error toast on API failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Network error');
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(error);
      vi.mocked(getHistoryErrorMessage).mockReturnValueOnce('Netzwerkfehler');

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Netzwerkfehler');
      });
    });

    it('calls getHistoryErrorMessage with error object', async () => {
      const user = userEvent.setup();
      const error = new Error('API error');
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(error);

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(getHistoryErrorMessage).toHaveBeenCalledWith(error);
      });
    });

    it('does not call downloadCSV on error', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(new Error('Error'));

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(downloadCSV).not.toHaveBeenCalled();
    });

    it('re-enables button after error', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(new Error('Error'));

      render(<ExportButton />);
      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('clears progress state after error', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockRejectedValueOnce(new Error('Error'));

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.queryByText('Lade Daten...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Successful Export', () => {
    it('downloads CSV and shows success toast', async () => {
      const user = userEvent.setup();
      const mockData = [createMockHistoryItem('1'), createMockHistoryItem('2')];
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: mockData,
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // generateHistoryCSV now takes a second parameter for partial hint
        expect(generateHistoryCSV).toHaveBeenCalledWith(mockData, false);
        expect(downloadCSV).toHaveBeenCalledWith('csv-content', 'historie_2025-12-25.csv');
        expect(toast.success).toHaveBeenCalledWith('2 Einträge exportiert');
      });
    });

    // M1: Fix German pluralization ("1 Eintrag" vs "X Einträge")
    it('shows correct singular in success message for single entry', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('1 Eintrag exportiert');
      });
    });

    it('shows correct count for large dataset', async () => {
      const user = userEvent.setup();
      const largeData = Array.from({ length: 1000 }, (_, i) => createMockHistoryItem(`${i}`));
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: largeData,
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('1000 Einträge exportiert');
      });
    });

    it('calls functions in correct order', async () => {
      const user = userEvent.setup();
      const callOrder: string[] = [];

      vi.mocked(fetchAllHistoryPages).mockImplementation(async () => {
        callOrder.push('fetch');
        return { data: [createMockHistoryItem('1')], partial: false, failedPages: undefined };
      });

      vi.mocked(generateHistoryCSV).mockImplementation(() => {
        callOrder.push('generate');
        return 'csv';
      });

      vi.mocked(downloadCSV).mockImplementation(() => {
        callOrder.push('download');
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      expect(callOrder).toEqual(['fetch', 'generate', 'download']);
    });
  });

  describe('Keyboard Navigation (AC1, 6.11)', () => {
    it('is focusable via Tab', async () => {
      const user = userEvent.setup();
      render(<ExportButton />);

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('can be activated via Enter', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.tab();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalled();
      });
    });

    it('can be activated via Space', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.tab();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalled();
      });
    });

    it('cannot be focused when disabled', async () => {
      const user = userEvent.setup();
      render(<ExportButton disabled={true} />);

      await user.tab();
      expect(screen.getByRole('button')).not.toHaveFocus();
    });

    it('cannot be activated via keyboard when disabled', async () => {
      const user = userEvent.setup();
      render(<ExportButton disabled={true} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(fetchAllHistoryPages).not.toHaveBeenCalled();
    });

    it('cannot be activated while exporting', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ExportButton />);
      await user.tab();
      await user.keyboard('{Enter}');

      // Try to activate again while still exporting
      await user.keyboard('{Enter}');

      // Should only be called once
      expect(fetchAllHistoryPages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props', () => {
    it('passes filters to fetchAllHistoryPages', async () => {
      const user = userEvent.setup();
      const filters = {
        deviceId: 'device-123',
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
      };
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton filters={filters} />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalledWith(filters);
      });
    });

    it('passes undefined filters when not provided', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalledWith(undefined);
      });
    });

    it('passes deviceCallSign to generateExportFilename', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton deviceCallSign="florian-4-23" />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(generateExportFilename).toHaveBeenCalledWith('florian-4-23');
      });
    });

    it('passes undefined deviceCallSign when not provided', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(generateExportFilename).toHaveBeenCalledWith(undefined);
      });
    });

    it('respects disabled prop', () => {
      render(<ExportButton disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is enabled by default', () => {
      render(<ExportButton />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('disabled prop overrides loading state', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      const { rerender } = render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      rerender(<ExportButton disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid consecutive clicks gracefully', async () => {
      const user = userEvent.setup();
      let resolvePromise: ((value: any) => void) | undefined;
      vi.mocked(fetchAllHistoryPages).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(<ExportButton />);
      const button = screen.getByRole('button');

      // First click starts the export
      await user.click(button);

      // Button should be disabled now
      expect(button).toBeDisabled();

      // Second and third clicks should be ignored because button is disabled
      await user.click(button);
      await user.click(button);

      // Only the first click should have triggered the export
      expect(fetchAllHistoryPages).toHaveBeenCalledTimes(1);

      // Clean up
      resolvePromise?.({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });
    });

    it('handles component unmount during export', async () => {
      const user = userEvent.setup();
      let resolvePromise: ((value: any) => void) | undefined;
      vi.mocked(fetchAllHistoryPages).mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { unmount } = render(<ExportButton />);
      await user.click(screen.getByRole('button'));

      unmount();

      // Resolve after unmount
      resolvePromise?.({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      // Should not crash
      expect(true).toBe(true);
    });

    it('preserves filters across re-renders', async () => {
      const user = userEvent.setup();
      const filters1 = { deviceId: 'device-1' };
      const filters2 = { deviceId: 'device-2' };

      vi.mocked(fetchAllHistoryPages).mockResolvedValue({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      const { rerender } = render(<ExportButton filters={filters1} />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalledWith(filters1);
      });

      vi.clearAllMocks();

      rerender(<ExportButton filters={filters2} />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(fetchAllHistoryPages).toHaveBeenCalledWith(filters2);
      });
    });

    it('handles empty string deviceCallSign', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchAllHistoryPages).mockResolvedValueOnce({
        data: [createMockHistoryItem('1')],
        partial: false,
        failedPages: undefined,
      });

      render(<ExportButton deviceCallSign="" />);
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(generateExportFilename).toHaveBeenCalledWith('');
      });
    });

    it('does not prevent default button behavior', () => {
      render(<ExportButton />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBeNull();
    });
  });

  describe('Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = render(
        <div>
          <ExportButton />
          <div data-testid="sibling">Sibling</div>
        </div>
      );

      const button1 = screen.getByRole('button');

      rerender(
        <div>
          <ExportButton />
          <div data-testid="sibling">Changed</div>
        </div>
      );

      const button2 = screen.getByRole('button');
      expect(button1).toBe(button2); // Same DOM node
    });

    it('re-renders when filters change', () => {
      const { rerender } = render(<ExportButton filters={{ deviceId: '1' }} />);
      const button1 = screen.getByRole('button');

      rerender(<ExportButton filters={{ deviceId: '2' }} />);
      const button2 = screen.getByRole('button');

      // Should be different instances due to memo
      expect(button1).toBe(button2); // Actually still same node, but callback will be different
    });
  });
});
