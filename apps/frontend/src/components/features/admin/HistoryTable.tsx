// apps/frontend/src/components/features/admin/HistoryTable.tsx
// Story 6.3: Admin Historie UI - Table Component (AC1, AC6, AC9)
import { memo, useMemo, Component, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { HistoryItem } from '@radio-inventar/shared';

interface HistoryTableProps {
  data: HistoryItem[];
  isFetching?: boolean;
}

/**
 * Sanitized history item for display
 */
interface SanitizedHistoryItem extends Omit<HistoryItem, 'device' | 'borrowerName' | 'returnNote'> {
  device: {
    id: string;
    callSign: string;
    deviceType: string;
    status: string;
  };
  borrowerName: string;
  returnNote: string | null;
}

/**
 * [AI-Review Fix] HIGH: ErrorBoundary for table rows
 * Prevents one corrupted row from crashing the entire table
 */
interface RowErrorBoundaryState {
  hasError: boolean;
}

class RowErrorBoundary extends Component<{ children: ReactNode; itemId: string }, RowErrorBoundaryState> {
  constructor(props: { children: ReactNode; itemId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): RowErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error rendering row ${this.props.itemId}:`, error);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <TableRow className="bg-red-50 dark:bg-red-950/20">
          <TableCell colSpan={7} className="text-center text-destructive">
            Fehler beim Anzeigen dieser Zeile
          </TableCell>
        </TableRow>
      );
    }
    return this.props.children;
  }
}

/**
 * Memoized table row component to prevent unnecessary re-renders
 */
const HistoryTableRow = memo(function HistoryTableRow({
  item,
}: {
  item: SanitizedHistoryItem;
}) {
  const isActive = item.returnedAt === null;

  return (
    <TableRow
      className={cn(
        'min-h-[56px]', // AC9: Touch-optimized row height
        isActive && 'bg-orange-50 dark:bg-orange-950/20' // AC1: Orange highlight for active loans
      )}
    >
      <TableCell className="font-medium">{item.device.callSign}</TableCell>
      <TableCell>{item.device.deviceType}</TableCell>
      {/* [MEDIUM-FIX] Add max-width and truncate to prevent layout breaks with long names */}
      <TableCell className="max-w-[150px] truncate">{item.borrowerName}</TableCell>
      <TableCell>{formatDateTime(item.borrowedAt)}</TableCell>
      <TableCell>
        {item.returnedAt ? formatDateTime(item.returnedAt) : '-'}
      </TableCell>
      {/* [AI-Review Fix] CRITICAL: Removed title attribute to prevent XSS via HTML attribute injection */}
      <TableCell className="max-w-[200px] truncate">
        {item.returnNote || '-'}
      </TableCell>
      <TableCell>
        {isActive ? (
          <Badge className="bg-orange-500 dark:bg-orange-600 text-white">
            Ausgeliehen
          </Badge>
        ) : (
          <Badge variant="secondary">Zurückgegeben</Badge>
        )}
      </TableCell>
    </TableRow>
  );
});

/**
 * History table with XSS protection and memoization
 * AC1: Display all loan history columns
 * AC6: Subtle fetching indicator (opacity change)
 * AC9: Touch-optimized row heights
 */
export function HistoryTable({ data, isFetching = false }: HistoryTableProps) {
  // XSS Protection with memoization (Task 4.4)
  const sanitizedData = useMemo<SanitizedHistoryItem[]>(
    () =>
      data.map(item => ({
        ...item,
        device: {
          ...item.device,
          callSign: sanitizeForDisplay(item.device.callSign),
          deviceType: sanitizeForDisplay(item.device.deviceType),
          // [AI-Review Fix] CRITICAL: Also sanitize device.status for XSS protection
          status: sanitizeForDisplay(item.device.status),
        },
        borrowerName: sanitizeForDisplay(item.borrowerName),
        returnNote: item.returnNote ? sanitizeForDisplay(item.returnNote) : null,
      })),
    [data]
  );

  return (
    <div
      className={cn(
        'rounded-md border transition-opacity',
        isFetching && 'opacity-70' // AC6: Subtle indicator during refetch
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[15%]">Gerät</TableHead>
            <TableHead className="w-[12%]">Typ</TableHead>
            <TableHead className="w-[15%]">Ausleiher</TableHead>
            <TableHead className="w-[15%]">Ausgeliehen</TableHead>
            <TableHead className="w-[15%]">Zurückgegeben</TableHead>
            <TableHead className="w-[15%]">Notiz</TableHead>
            <TableHead className="w-[13%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sanitizedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                Keine Ausleihen gefunden
              </TableCell>
            </TableRow>
          ) : (
            sanitizedData.map(item => (
              // [AI-Review Fix] HIGH: Wrap each row in ErrorBoundary
              <RowErrorBoundary key={item.id} itemId={item.id}>
                <HistoryTableRow item={item} />
              </RowErrorBoundary>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
