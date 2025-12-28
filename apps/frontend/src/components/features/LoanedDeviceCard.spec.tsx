import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanedDeviceCard } from './LoanedDeviceCard';
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

describe('LoanedDeviceCard', () => {
  it('renders loan device callSign', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
  });

  it('formats borrowedAt date in de-DE locale', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    // de-DE format: DD.MM.YYYY (e.g., "15.12.2025")
    expect(screen.getByText(/Ausgeliehen am \d{1,2}\.\d{1,2}\.\d{4}/)).toBeInTheDocument();
  });

  it('displays the formatted date correctly', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    // The formatDate function should format '2025-12-15T10:30:00Z' as '15.12.2025'
    expect(screen.getByText(/15\.12\.2025/)).toBeInTheDocument();
  });

  it('sanitizes callSign to prevent XSS attacks', () => {
    const xssLoan: ActiveLoan = {
      ...mockLoan,
      device: {
        ...mockLoan.device,
        callSign: '<script>alert("xss")</script>',
      },
    };
    render(<LoanedDeviceCard loan={xssLoan} />);
    // HTML tags should be stripped
    expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
    expect(screen.getByText(/scriptalert/i)).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <LoanedDeviceCard loan={mockLoan} className="custom-class" />
    );
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass('custom-class');
  });

  it('has min-height of 56px for touch targets', () => {
    const { container } = render(<LoanedDeviceCard loan={mockLoan} />);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass('min-h-[56px]');
  });

  it('applies dark mode classes', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    // Check that dark mode classes are present in the DOM
    const callSignElement = screen.getByText('Florian 4-23');
    expect(callSignElement).toHaveClass('dark:text-foreground');
  });

  it('is memoized', () => {
    // LoanedDeviceCard should be wrapped with memo()
    expect(LoanedDeviceCard).toBeDefined();
    // memo() returns a component with displayName
    expect((LoanedDeviceCard as any).$$typeof).toBeDefined();
  });

  it('handles empty callSign gracefully', () => {
    const emptyLoan: ActiveLoan = {
      ...mockLoan,
      device: {
        ...mockLoan.device,
        callSign: '',
      },
    };
    const { container } = render(<LoanedDeviceCard loan={emptyLoan} />);
    // Should render without crashing, sanitizeForDisplay returns empty string
    expect(container).toBeInTheDocument();
  });

  it('handles invalid date string gracefully', () => {
    const invalidDateLoan: ActiveLoan = {
      ...mockLoan,
      borrowedAt: 'invalid-date',
    };
    render(<LoanedDeviceCard loan={invalidDateLoan} />);
    // formatDate returns empty string for invalid dates
    expect(screen.getByText(/Ausgeliehen am\s*$/)).toBeInTheDocument();
  });

  it('sanitizes callSign with special characters', () => {
    const specialCharLoan: ActiveLoan = {
      ...mockLoan,
      device: {
        ...mockLoan.device,
        callSign: 'Test"\'`<>',
      },
    };
    render(<LoanedDeviceCard loan={specialCharLoan} />);
    // Quotes and HTML chars should be stripped
    const text = screen.getByText(/Test/);
    expect(text.textContent).toBe('Test');
  });

  it('uses p-4 padding in CardContent', () => {
    const { container } = render(<LoanedDeviceCard loan={mockLoan} />);
    const cardContent = container.querySelector('[data-slot="card-content"]');
    expect(cardContent).toHaveClass('p-4');
  });

  it('displays callSign with font-semibold', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    const callSignElement = screen.getByText('Florian 4-23');
    expect(callSignElement).toHaveClass('font-semibold');
  });

  it('displays date with text-sm and text-muted-foreground', () => {
    render(<LoanedDeviceCard loan={mockLoan} />);
    const dateElement = screen.getByText(/Ausgeliehen am/);
    expect(dateElement).toHaveClass('text-sm');
    expect(dateElement).toHaveClass('text-muted-foreground');
  });

  describe('Click Interaction (Story 4.3)', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not apply click styles when onClick is undefined', () => {
      const { container } = render(<LoanedDeviceCard loan={mockLoan} />);
      const card = container.querySelector('[data-slot="card"]');

      expect(card).not.toHaveClass('cursor-pointer');
      expect(card).not.toHaveClass('hover:bg-accent');
      expect(card).not.toHaveClass('active:scale-[0.98]');
    });

    it('applies cursor-pointer when onClick is provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />
      );
      const card = container.querySelector('[data-slot="card"]');

      expect(card).toHaveClass('cursor-pointer');
    });

    it('applies hover styles when onClick is provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />
      );
      const card = container.querySelector('[data-slot="card"]');

      expect(card).toHaveClass('hover:bg-accent/50');
    });

    it('applies active:scale-[0.98] when onClick is provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />
      );
      const card = container.querySelector('[data-slot="card"]');

      expect(card).toHaveClass('active:scale-[0.98]');
    });
  });

  describe('Keyboard Support (Story 4.3)', () => {
    it('calls onClick when Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space is pressed', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on other keys', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Escape}');
      await user.keyboard('a');
      await user.keyboard('{Tab}');

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('sets tabIndex=0 when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('does not set tabIndex when onClick is undefined', () => {
      const { container } = render(<LoanedDeviceCard loan={mockLoan} />);
      const card = container.querySelector('[data-slot="card"]');

      expect(card).not.toHaveAttribute('tabindex');
    });
  });

  describe('ARIA Accessibility (Story 4.3)', () => {
    it('sets role="button" when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('does not set role when onClick is undefined', () => {
      render(<LoanedDeviceCard loan={mockLoan} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('sets aria-label with device name when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<LoanedDeviceCard loan={mockLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Florian 4-23 zurückgeben');
    });

    it('sanitizes device name in aria-label', () => {
      const mockOnClick = vi.fn();
      const xssLoan: ActiveLoan = {
        ...mockLoan,
        device: {
          ...mockLoan.device,
          callSign: '<script>alert("xss")</script>',
        },
      };

      render(<LoanedDeviceCard loan={xssLoan} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      const ariaLabel = card.getAttribute('aria-label');

      expect(ariaLabel).not.toContain('<script>');
      expect(ariaLabel).toContain('scriptalert');
    });
  });
});
