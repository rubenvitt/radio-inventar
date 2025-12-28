// apps/frontend/src/components/features/admin/HistoryPagination.spec.tsx
// Story 6.3: Admin Historie UI - HistoryPagination Tests (Task 11)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPagination } from './HistoryPagination';

describe('HistoryPagination', () => {
  const defaultMeta = {
    total: 250,
    page: 1,
    pageSize: 100,
    totalPages: 3,
  };

  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Rendering Tests ===
  describe('Rendering', () => {
    it('should show "Zeige X-Y von Z" text', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/zeige 1-100 von 250/i)).toBeInTheDocument();
    });

    it('should show "Seite X von Y" text', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/seite 1 von 3/i)).toBeInTheDocument();
    });

    it('should show all 4 navigation buttons', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /erste seite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vorherige seite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /nächste seite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /letzte seite/i })).toBeInTheDocument();
    });

    it('should calculate correct item range for middle page', () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 2 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/zeige 101-200 von 250/i)).toBeInTheDocument();
    });

    it('should calculate correct item range for last page', () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/zeige 201-250 von 250/i)).toBeInTheDocument();
    });
  });

  // === Navigation Tests ===
  describe('Navigation', () => {
    it('should disable first page button on page 1', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /erste seite/i })).toBeDisabled();
    });

    it('should disable previous button on page 1', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /vorherige seite/i })).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /nächste seite/i })).toBeDisabled();
    });

    it('should disable last page button on last page', () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /letzte seite/i })).toBeDisabled();
    });

    it('should call onPageChange with 1 when first button clicked', async () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 2 }}
          onPageChange={mockOnPageChange}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /erste seite/i }));

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with page-1 when previous button clicked', async () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 2 }}
          onPageChange={mockOnPageChange}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /vorherige seite/i }));

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with page+1 when next button clicked', async () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /nächste seite/i }));

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with totalPages when last button clicked', async () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /letzte seite/i }));

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });
  });

  // === Edge Cases ===
  describe('Edge Cases', () => {
    it('should be hidden when totalPages <= 1', () => {
      const { container } = render(
        <HistoryPagination
          meta={{ total: 50, page: 1, pageSize: 100, totalPages: 1 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should handle single-item pages correctly', () => {
      render(
        <HistoryPagination
          meta={{ total: 5, page: 1, pageSize: 2, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/zeige 1-2 von 5/i)).toBeInTheDocument();
    });

    it('should handle last page with fewer items', () => {
      render(
        <HistoryPagination
          meta={{ total: 5, page: 3, pageSize: 2, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/zeige 5-5 von 5/i)).toBeInTheDocument();
    });
  });

  // === Touch Optimization Tests ===
  describe('Touch Optimization', () => {
    // [AI-Review Fix] CRITICAL: Updated to min-h-16 (64px) per AC9 requirements
    it('should have min-h-16 on buttons for touch targets (AC9)', () => {
      render(
        <HistoryPagination
          meta={defaultMeta}
          onPageChange={mockOnPageChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button).toHaveClass('min-h-16');
      }
    });
  });

  // === Disabled State Tests ===
  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <HistoryPagination
          meta={{ ...defaultMeta, page: 2 }}
          onPageChange={mockOnPageChange}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button).toBeDisabled();
      }
    });
  });
});
