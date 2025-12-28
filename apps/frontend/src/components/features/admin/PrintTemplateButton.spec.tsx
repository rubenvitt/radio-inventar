import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrintTemplateButton } from './PrintTemplateButton';

// Mock all dependencies
vi.mock('@/api/admin-print', () => ({
  downloadPrintTemplate: vi.fn(),
  triggerBlobDownload: vi.fn(),
  getPrintErrorMessage: vi.fn(() => 'PDF-Generierung fehlgeschlagen. Bitte erneut versuchen.'),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { downloadPrintTemplate, triggerBlobDownload, getPrintErrorMessage } from '@/api/admin-print';
import { toast } from 'sonner';

describe('PrintTemplateButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with correct text and icon', () => {
      render(<PrintTemplateButton />);
      // Button accessible name comes from aria-label
      expect(screen.getByRole('button', { name: /druckvorlage als pdf herunterladen/i })).toBeInTheDocument();
      expect(screen.getByText('Druckvorlage erstellen')).toBeInTheDocument();
    });

    it('has correct aria-label for accessibility', () => {
      render(<PrintTemplateButton />);
      expect(screen.getByLabelText('Druckvorlage als PDF herunterladen')).toBeInTheDocument();
    });

    it('renders Printer icon when not loading', () => {
      render(<PrintTemplateButton />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('has 64px minimum height for touch targets', () => {
      render(<PrintTemplateButton />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-16');
    });

    it('is keyboard accessible (Tab + Enter)', async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPrintTemplate).mockResolvedValue(new Blob(['PDF'], { type: 'application/pdf' }));

      render(<PrintTemplateButton />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(downloadPrintTemplate).toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('shows Loader2 spinner during download', async () => {
      const user = userEvent.setup();

      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: Blob) => void;
      const pendingPromise = new Promise<Blob>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(downloadPrintTemplate).mockReturnValue(pendingPromise);

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Erstelle PDF...')).toBeInTheDocument();
      });

      // Button should be disabled
      expect(screen.getByRole('button')).toBeDisabled();

      // Resolve the promise
      resolvePromise!(new Blob(['PDF'], { type: 'application/pdf' }));
    });

    it('disables button during download', async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: Blob) => void;
      const pendingPromise = new Promise<Blob>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(downloadPrintTemplate).mockReturnValue(pendingPromise);

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toBeDisabled();

      resolvePromise!(new Blob(['PDF'], { type: 'application/pdf' }));
    });
  });

  describe('Success handling', () => {
    it('shows success toast on successful download', async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPrintTemplate).mockResolvedValue(new Blob(['PDF'], { type: 'application/pdf' }));

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('PDF heruntergeladen');
      });
    });

    it('triggers blob download with correct filename', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['PDF'], { type: 'application/pdf' });
      vi.mocked(downloadPrintTemplate).mockResolvedValue(mockBlob);

      // Mock date for predictable filename
      vi.setSystemTime(new Date('2025-12-28'));

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(triggerBlobDownload).toHaveBeenCalledWith(
          mockBlob,
          'geraete-liste-2025-12-28.pdf'
        );
      });

      vi.useRealTimers();
    });
  });

  describe('Error handling', () => {
    it('shows error toast with German message on failure', async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPrintTemplate).mockRejectedValue(new Error('Network error'));
      vi.mocked(getPrintErrorMessage).mockReturnValue('PDF-Generierung fehlgeschlagen. Bitte erneut versuchen.');

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('PDF-Generierung fehlgeschlagen. Bitte erneut versuchen.');
      });
    });

    it('shows timeout error message on AbortError', async () => {
      const user = userEvent.setup();
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.mocked(downloadPrintTemplate).mockRejectedValue(abortError);
      vi.mocked(getPrintErrorMessage).mockReturnValue('Zeitüberschreitung. Bitte erneut versuchen.');

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Zeitüberschreitung. Bitte erneut versuchen.');
      });
    });

    it('re-enables button after error', async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPrintTemplate).mockRejectedValue(new Error('Server error'));

      render(<PrintTemplateButton />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });
  });

  describe('Disabled state', () => {
    it('respects disabled prop', () => {
      render(<PrintTemplateButton disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not trigger download when disabled', async () => {
      const user = userEvent.setup();
      render(<PrintTemplateButton disabled />);

      await user.click(screen.getByRole('button'));

      expect(downloadPrintTemplate).not.toHaveBeenCalled();
    });
  });
});
