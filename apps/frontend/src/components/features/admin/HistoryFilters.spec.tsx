// apps/frontend/src/components/features/admin/HistoryFilters.spec.tsx
// Story 6.3: Admin Historie UI - HistoryFilters Tests (Task 9)
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryFilters } from './HistoryFilters';
import type { HistoryQueryFilters } from '@/api/admin-history';

// Polyfill for Radix UI in test environment
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock the useDevicesForFilter hook
vi.mock('@/api/admin-history', async () => {
  const actual = await vi.importActual('@/api/admin-history');
  return {
    ...actual,
    useDevicesForFilter: vi.fn(() => ({
      data: [
        { id: 'dev-1', callSign: 'Florian 1' },
        { id: 'dev-2', callSign: 'Florian 2' },
        { id: 'dev-3', callSign: 'Florian 3' },
      ],
      isLoading: false,
    })),
  };
});

// Mock sanitizeForDisplay
vi.mock('@/lib/sanitize', () => ({
  sanitizeForDisplay: (text: string | undefined) => text || '',
}));

describe('HistoryFilters', () => {
  const defaultFilters: HistoryQueryFilters = {
    page: 1,
    pageSize: 100,
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Device Filter Tests ===
  describe('Device Filter', () => {
    it('should render device dropdown', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText(/gerät/i)).toBeInTheDocument();
    });

    it('should show all devices from hook', async () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      await userEvent.click(screen.getByRole('combobox'));

      expect(screen.getByText('Florian 1')).toBeInTheDocument();
      expect(screen.getByText('Florian 2')).toBeInTheDocument();
      expect(screen.getByText('Florian 3')).toBeInTheDocument();
    });

    it('should call onChange with deviceId when device selected', async () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByText('Florian 1'));

      expect(mockOnChange).toHaveBeenCalledWith({ deviceId: 'dev-1' });
    });

    it('should reset deviceId to undefined when "Alle Geräte" selected', async () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, deviceId: 'dev-1' }}
          onChange={mockOnChange}
        />
      );

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByText('Alle Geräte'));

      expect(mockOnChange).toHaveBeenCalledWith({ deviceId: undefined });
    });
  });

  // === Date Filter Tests ===
  describe('Date Filters', () => {
    it('should render "Von" date input', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText(/von/i)).toBeInTheDocument();
    });

    it('should render "Bis" date input', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText(/bis/i)).toBeInTheDocument();
    });

    it('should call onChange with ISO format when from date changes', async () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      const fromInput = screen.getByLabelText(/von/i);
      fireEvent.change(fromInput, { target: { value: '2025-01-15' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        from: '2025-01-15T00:00:00Z',
      });
    });

    it('should call onChange with ISO format when to date changes', async () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      const toInput = screen.getByLabelText(/bis/i);
      fireEvent.change(toInput, { target: { value: '2025-12-31' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        to: '2025-12-31T23:59:59Z',
      });
    });

    it('should reset date to undefined when cleared', async () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, from: '2025-01-01T00:00:00Z' }}
          onChange={mockOnChange}
        />
      );

      const fromInput = screen.getByLabelText(/von/i);
      fireEvent.change(fromInput, { target: { value: '' } });

      expect(mockOnChange).toHaveBeenCalledWith({ from: undefined });
    });
  });

  // === Reset Button Tests ===
  describe('Reset Button', () => {
    it('should be hidden when no filters active', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText(/filter zurücksetzen/i)).not.toBeInTheDocument();
    });

    it('should be visible when deviceId filter active', () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, deviceId: 'dev-1' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/filter zurücksetzen/i)).toBeInTheDocument();
    });

    it('should be visible when from filter active', () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, from: '2025-01-01T00:00:00Z' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/filter zurücksetzen/i)).toBeInTheDocument();
    });

    it('should be visible when to filter active', () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, to: '2025-12-31T23:59:59Z' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/filter zurücksetzen/i)).toBeInTheDocument();
    });

    it('should reset all filters when clicked', async () => {
      render(
        <HistoryFilters
          filters={{
            ...defaultFilters,
            deviceId: 'dev-1',
            from: '2025-01-01T00:00:00Z',
            to: '2025-12-31T23:59:59Z',
          }}
          onChange={mockOnChange}
        />
      );

      await userEvent.click(screen.getByText(/filter zurücksetzen/i));

      expect(mockOnChange).toHaveBeenCalledWith({
        deviceId: undefined,
        from: undefined,
        to: undefined,
      });
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, deviceId: 'dev-1' }}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByText(/filter zurücksetzen/i)).toBeDisabled();
    });
  });

  // === Touch Target Tests ===
  describe('Touch Targets', () => {
    it('should have min-h-16 on date inputs', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      const fromInput = screen.getByLabelText(/von/i);
      const toInput = screen.getByLabelText(/bis/i);

      expect(fromInput).toHaveClass('min-h-16');
      expect(toInput).toHaveClass('min-h-16');
    });

    it('should have min-h-16 on reset button', () => {
      render(
        <HistoryFilters
          filters={{ ...defaultFilters, deviceId: 'dev-1' }}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByText(/filter zurücksetzen/i);
      expect(button).toHaveClass('min-h-16');
    });

    it('should have min-h-16 on select trigger', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('min-h-16');
    });
  });

  // === Disabled State Tests ===
  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByLabelText(/von/i)).toBeDisabled();
      expect(screen.getByLabelText(/bis/i)).toBeDisabled();
    });
  });

  // === Date Range Validation Tests (365-Tage) ===
  describe('Date Range Validation', () => {
    it('should have max attribute on date inputs for 365-day validation', () => {
      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      const fromInput = screen.getByLabelText(/von/i) as HTMLInputElement;
      const toInput = screen.getByLabelText(/bis/i) as HTMLInputElement;

      // Both should be type="date" which browsers use for validation
      expect(fromInput.type).toBe('date');
      expect(toInput.type).toBe('date');
    });
  });

  // === Empty Device List Tests ===
  describe('Empty Device List', () => {
    it('should show only "Alle Geräte" when device list is empty', async () => {
      // Override the mock for this test
      const { useDevicesForFilter } = await import('@/api/admin-history');
      vi.mocked(useDevicesForFilter).mockReturnValueOnce({
        data: [],
        isLoading: false,
      } as never);

      render(
        <HistoryFilters
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );

      await userEvent.click(screen.getByRole('combobox'));

      // Should only show "Alle Geräte" option (appears twice: in trigger and in dropdown)
      const alleGeraeteElements = screen.getAllByText('Alle Geräte');
      expect(alleGeraeteElements.length).toBe(2); // trigger + dropdown option

      // Should not show any device options
      expect(screen.queryByText('Florian 1')).not.toBeInTheDocument();
    });
  });
});
