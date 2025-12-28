import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BorrowerInput } from './BorrowerInput';

// Mock the useBorrowerSuggestions hook
vi.mock('@/api/borrowers', () => ({
  useBorrowerSuggestions: vi.fn(),
}));

import { useBorrowerSuggestions } from '@/api/borrowers';

const mockUseBorrowerSuggestions = useBorrowerSuggestions as ReturnType<typeof vi.fn>;

// Helper to create mock return value
function createMockReturn(overrides: Partial<ReturnType<typeof useBorrowerSuggestions>> = {}) {
  return {
    data: [],
    isLoading: false,
    isFetched: true,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

// Mock suggestions data
const mockSuggestions = [
  { name: 'Tim Mueller', lastUsed: '2025-12-15T10:00:00.000Z' },
  { name: 'Tim Schaefer', lastUsed: '2025-12-14T14:30:00.000Z' },
  { name: 'Thomas Wagner', lastUsed: '2025-12-10T09:00:00.000Z' },
];

describe('BorrowerInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBorrowerSuggestions.mockReturnValue(createMockReturn());
  });

  describe('Rendering', () => {
    it('rendert Input mit min-height 56px', () => {
      render(<BorrowerInput value="" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('min-h-[56px]');
    });

    it('zeigt Placeholder "Name eingeben..."', () => {
      render(<BorrowerInput value="" onChange={vi.fn()} />);
      expect(screen.getByPlaceholderText('Name eingeben...')).toBeInTheDocument();
    });

    it('ist disabled wenn disabled prop true', () => {
      render(<BorrowerInput value="" onChange={vi.fn()} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('zeigt aktuellen Wert im Input', () => {
      render(<BorrowerInput value="Test Name" onChange={vi.fn()} />);
      expect(screen.getByRole('combobox')).toHaveValue('Test Name');
    });
  });

  describe('Autocomplete Behavior', () => {
    it('zeigt keine Suggestions bei weniger als 2 Zeichen', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<BorrowerInput value="" onChange={onChange} />);

      await user.type(screen.getByRole('combobox'), 'T');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('zeigt Suggestions nach 2 Zeichen', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input); // Focus to show suggestions

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Tim Mueller')).toBeInTheDocument();
    });

    it('zeigt Loading-State waehrend API-Fetch', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        isLoading: true,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('zeigt "Keine Vorschlaege" bei leeren Results', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: [],
      }));

      render(<BorrowerInput value="xyz" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      // Text appears in both visible message and aria-live region
      const messages = screen.getAllByText('Keine Vorschlaege gefunden');
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });

    it('zeigt Error mit Retry bei API-Fehler', async () => {
      const refetch = vi.fn();
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        error: new Error('Network error'),
        refetch,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Erneut versuchen'));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Interaction', () => {
    it('waehlt Suggestion bei Click', async () => {
      const onChange = vi.fn();
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={onChange} />);
      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByText('Tim Mueller'));

      expect(onChange).toHaveBeenCalledWith('Tim Mueller');
    });

    it('ruft onChange bei Eingabe auf', async () => {
      const onChange = vi.fn();
      render(<BorrowerInput value="" onChange={onChange} />);

      await userEvent.type(screen.getByRole('combobox'), 'Test');

      expect(onChange).toHaveBeenCalledTimes(4); // T, e, s, t
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));
    });

    it('ArrowDown navigiert zu naechster Suggestion', async () => {
      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      await userEvent.keyboard('{ArrowDown}');

      const firstOption = screen.getByRole('option', { name: /Tim Mueller/i });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp navigiert zu vorheriger Suggestion (wrap around)', async () => {
      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      await userEvent.keyboard('{ArrowUp}');

      // Should wrap to last item
      const lastOption = screen.getByRole('option', { name: /Thomas Wagner/i });
      expect(lastOption).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter waehlt highlighted Suggestion', async () => {
      const onChange = vi.fn();
      render(<BorrowerInput value="Ti" onChange={onChange} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('Tim Mueller');
    });

    it('Escape schliesst Dropdown', async () => {
      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('Home springt zur ersten Suggestion', async () => {
      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      // Navigate down first
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      // Then Home
      await userEvent.keyboard('{Home}');

      const firstOption = screen.getByRole('option', { name: /Tim Mueller/i });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('End springt zur letzten Suggestion', async () => {
      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      await userEvent.keyboard('{End}');

      const lastOption = screen.getByRole('option', { name: /Thomas Wagner/i });
      expect(lastOption).toHaveAttribute('aria-selected', 'true');
    });

    it('Tab schliesst Dropdown ohne Auswahl', async () => {
      const onChange = vi.fn();
      render(<BorrowerInput value="Ti" onChange={onChange} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await userEvent.keyboard('{Tab}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Accessibility', () => {
    it('hat role="combobox" auf Input', () => {
      render(<BorrowerInput value="" onChange={vi.fn()} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('hat aria-expanded entsprechend Dropdown-State', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');

      expect(input).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('hat aria-activedescendant bei Keyboard Navigation', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(input).not.toHaveAttribute('aria-activedescendant');

      await userEvent.keyboard('{ArrowDown}');

      expect(input).toHaveAttribute('aria-activedescendant');
    });

    it('Suggestions haben role="option"', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });
  });

  describe('XSS Sanitization', () => {
    it('sanitized malicious names in Suggestions', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: [
          { name: '<script>alert(1)</script>Tim', lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      // Script tags should be removed
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
      expect(screen.getByText('scriptalert(1)/scriptTim')).toBeInTheDocument();
    });

    it('sanitized selection in onChange callback', async () => {
      const onChange = vi.fn();
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: [
          { name: '<img src=x onerror=alert(1)>Test', lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      }));

      render(<BorrowerInput value="Te" onChange={onChange} />);
      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByRole('option'));

      // Should receive sanitized value
      expect(onChange).toHaveBeenCalledWith('img src=x onerror=alert(1)Test');
    });

    it('sanitized RTL und Zero-Width Zeichen', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: [
          { name: 'Tim\u200BMueller\u202E', lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      // Zero-width and RTL chars should be removed
      expect(screen.getByText('TimMueller')).toBeInTheDocument();
    });

    it('sanitized Quotes in Namen', async () => {
      const onChange = vi.fn();
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: [
          { name: "O'Brien \"Test\"", lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      }));

      render(<BorrowerInput value="OB" onChange={onChange} />);
      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByRole('option'));

      // Quotes should be removed
      expect(onChange).toHaveBeenCalledWith('OBrien Test');
    });
  });

  describe('Touch Targets', () => {
    it('Input hat mindestens 56px Hoehe', () => {
      render(<BorrowerInput value="" onChange={vi.fn()} />);
      const input = screen.getByRole('combobox');
      expect(input.className).toContain('min-h-[56px]');
    });

    it('Suggestion Items haben mindestens 44px Hoehe', async () => {
      mockUseBorrowerSuggestions.mockReturnValue(createMockReturn({
        data: mockSuggestions,
      }));

      render(<BorrowerInput value="Ti" onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option.className).toContain('min-h-[44px]');
      });
    });
  });
});
