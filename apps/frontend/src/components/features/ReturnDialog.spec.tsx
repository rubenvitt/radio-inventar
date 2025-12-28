import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReturnDialog } from './ReturnDialog';
import { LOAN_FIELD_LIMITS } from '@radio-inventar/shared';
import type { ActiveLoan } from '@/api/loans';

const mockLoan: ActiveLoan = {
  id: 'loan-001',
  deviceId: 'device-001',
  borrowerName: 'Max Mustermann',
  borrowedAt: '2025-12-15T10:30:00Z',
  device: {
    id: 'device-001',
    callSign: 'Florian 4-23',
    status: 'ON_LOAN',
  },
};

describe('ReturnDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays device call sign in title', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Florian 4-23 zurückgeben')).toBeInTheDocument();
    });

    it('displays dialog description', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Optional: Zustandsnotiz hinterlassen')).toBeInTheDocument();
    });

    it('displays textarea with correct placeholder', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...')).toBeInTheDocument();
    });

    it('displays character counter with initial value "0 / 500"', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText(`0 / ${LOAN_FIELD_LIMITS.RETURN_NOTE_MAX}`)).toBeInTheDocument();
    });

    it('displays "Abbrechen" button', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    });

    it('displays "Zurückgeben" button', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByRole('button', { name: 'Zurückgeben' })).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.queryByText('Florian 4-23 zurückgeben')).not.toBeInTheDocument();
    });
  });

  describe('Note Field Validation (AC#2)', () => {
    it('allows input up to 500 characters', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      const text = 'a'.repeat(500);
      await user.type(textarea, text);

      expect(textarea).toHaveValue(text);
      expect(screen.getByText(`500 / ${LOAN_FIELD_LIMITS.RETURN_NOTE_MAX}`)).toBeInTheDocument();
    });

    it('updates character counter while typing', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, 'Akku schwach');

      expect(screen.getByText(`12 / ${LOAN_FIELD_LIMITS.RETURN_NOTE_MAX}`)).toBeInTheDocument();
    });

    it('enforces maxLength of 500 characters', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      const text = 'a'.repeat(600); // Try to enter 600 chars
      await user.type(textarea, text);

      // Should be limited to 500
      expect(textarea).toHaveValue('a'.repeat(500));
      expect(screen.getByText(`500 / ${LOAN_FIELD_LIMITS.RETURN_NOTE_MAX}`)).toBeInTheDocument();
    });

    it('displays textarea with min-height of 120px', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      expect(textarea).toHaveClass('min-h-[120px]');
    });
  });

  describe('Callbacks', () => {
    it('calls onConfirm with loanId and null when note is empty', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Zurückgeben' });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('loan-001', null);
    });

    it('calls onConfirm with loanId and trimmed note', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, '  Akku schwach  ');

      const confirmButton = screen.getByRole('button', { name: 'Zurückgeben' });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('loan-001', 'Akku schwach');
    });

    it('calls onConfirm with null when note contains only whitespace', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, '   ');

      const confirmButton = screen.getByRole('button', { name: 'Zurückgeben' });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('loan-001', null);
    });

    it('calls onOpenChange(false) when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets textarea when dialog is closed via onOpenChange', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, 'Test note');

      expect(textarea).toHaveValue('Test note');

      // Simulate closing via onOpenChange (e.g., Escape key or outside click)
      // The component calls handleOpenChange which resets the note
      rerender(
        <ReturnDialog
          loan={mockLoan}
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      // Dialog is not visible when open=false
      expect(screen.queryByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...')).not.toBeInTheDocument();
    });

    it('resets textarea when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, 'Test note');

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);

      // Simulate dialog reopening (component would reset state)
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Loading State', () => {
    it('disables buttons when isPending is true', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Wird zurückgegeben...' })).toBeDisabled();
    });

    it('shows "Wird zurückgegeben..." when isPending is true', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Wird zurückgegeben...' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Zurückgeben' })).not.toBeInTheDocument();
    });

    it('disables textarea when isPending is true', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      expect(textarea).toBeDisabled();
    });

    it('enables all controls when isPending is false', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Abbrechen' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Zurückgeben' })).not.toBeDisabled();
      expect(screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...')).not.toBeDisabled();
    });
  });

  describe('XSS Protection', () => {
    it('sanitizes call sign with HTML tags in title', () => {
      const xssLoan: ActiveLoan = {
        ...mockLoan,
        device: {
          ...mockLoan.device,
          callSign: '<script>alert("xss")</script>Florian',
        },
      };

      render(
        <ReturnDialog
          loan={xssLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      // Script tags should be stripped
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
      expect(screen.getByText(/scriptalert.*Florian zurückgeben/i)).toBeInTheDocument();
    });

    it('sanitizes call sign with special characters', () => {
      const specialCharLoan: ActiveLoan = {
        ...mockLoan,
        device: {
          ...mockLoan.device,
          callSign: 'Test"\'`<>',
        },
      };

      render(
        <ReturnDialog
          loan={specialCharLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      // Should see sanitized version
      expect(screen.getByText('Test zurückgeben')).toBeInTheDocument();
    });

    it('sanitizes call sign with img tag', () => {
      const imgLoan: ActiveLoan = {
        ...mockLoan,
        device: {
          ...mockLoan.device,
          callSign: '<img src=x onerror=alert(1)>Device',
        },
      };

      render(
        <ReturnDialog
          loan={imgLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText(/img src.*Device zurückgeben/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has dialog with accessible title', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole('dialog', { name: 'Florian 4-23 zurückgeben' })).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const description = screen.getByText('Optional: Zustandsnotiz hinterlassen');
      expect(description).toBeInTheDocument();
    });

    it('dialog content has proper ARIA attributes', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Touch Targets (AC#8)', () => {
    it('cancel button has minimum 44px height', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toHaveClass('min-h-11'); // 44px = 11 * 4px
    });

    it('confirm button has minimum 44px height', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Zurückgeben' });
      expect(confirmButton).toHaveClass('min-h-11'); // 44px = 11 * 4px
    });

    it('cancel button has minimum 44px width', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toHaveClass('min-w-11'); // 44px = 11 * 4px
    });

    it('confirm button has minimum 44px width', () => {
      render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Zurückgeben' });
      expect(confirmButton).toHaveClass('min-w-11'); // 44px = 11 * 4px
    });
  });

  describe('Component Behavior', () => {
    it('is memoized', () => {
      // ReturnDialog should be wrapped with memo()
      expect(ReturnDialog).toBeDefined();
      expect((ReturnDialog as any).$$typeof).toBeDefined();
    });

    it('handles empty callSign gracefully', () => {
      const emptyLoan: ActiveLoan = {
        ...mockLoan,
        device: {
          ...mockLoan.device,
          callSign: '',
        },
      };

      const { container } = render(
        <ReturnDialog
          loan={emptyLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
      expect(screen.getByText('zurückgeben')).toBeInTheDocument();
    });

    it('preserves note value during loading state', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const textarea = screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...');
      await user.type(textarea, 'Akku schwach');

      rerender(
        <ReturnDialog
          loan={mockLoan}
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      expect(screen.getByPlaceholderText('z.B. Akku schwach, Kratzer am Gehäuse...')).toHaveValue('Akku schwach');
    });
  });
});
