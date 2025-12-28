// apps/frontend/src/components/features/admin/HistoryPagination.tsx
// Story 6.3: Admin Historie UI - Pagination Component (AC5, AC9)
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface HistoryPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Pagination controls for history table
 * AC5: Pagination with first/prev/next/last buttons
 * AC9: Touch-optimized buttons (min 48px via size="lg")
 */
export function HistoryPagination({
  meta,
  onPageChange,
  disabled = false,
}: HistoryPaginationProps) {
  const { page, pageSize, total, totalPages } = meta;

  // Don't render pagination if only one page
  if (totalPages <= 1) return null;

  // [MEDIUM-FIX] Calculate display range with memoization to prevent unnecessary recalculations
  const startItem = useMemo(() => (page - 1) * pageSize + 1, [page, pageSize]);
  const endItem = useMemo(() => Math.min(page * pageSize, total), [page, pageSize, total]);

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className="flex items-center justify-between gap-4 pt-4 flex-wrap">
      {/* Item count display */}
      <span className="text-sm text-muted-foreground">
        Zeige {startItem}-{endItem} von {total}
      </span>

      {/* Navigation buttons */}
      <div className="flex items-center gap-2">
        {/* First page button - [AI-Review Fix] CRITICAL: 64px (min-h-16) for AC9 touch targets */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onPageChange(1)}
          disabled={disabled || isFirstPage}
          aria-label="Erste Seite"
          className="min-h-16 min-w-16"
        >
          <ChevronFirst className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || isFirstPage}
          aria-label="Vorherige Seite"
          className="min-h-16 min-w-16"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Page indicator */}
        <span className="flex items-center px-4 min-h-16 text-sm">
          Seite {page} von {totalPages}
        </span>

        {/* Next page button */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || isLastPage}
          aria-label="Nächste Seite"
          className="min-h-16 min-w-16"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || isLastPage}
          aria-label="Letzte Seite"
          className="min-h-16 min-w-16"
        >
          <ChevronLast className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
