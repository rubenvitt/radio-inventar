// apps/frontend/src/components/features/admin/DeviceTable.tsx
// Read-only device table. Devices are managed in radio-admin; this view only
// lists them (no inline status changes, edit, delete, or create).

import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/features/StatusBadge';
import { Loader2, Radio } from 'lucide-react';
import { sanitizeForDisplay } from '@/lib/sanitize';
import type { AdminDevice } from '@/api/admin-devices';

interface DeviceTableProps {
  devices: AdminDevice[];
  isLoading: boolean;
  isFetching: boolean;
}

const DeviceTableRow = memo(function DeviceTableRow({ device }: { device: AdminDevice }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{sanitizeForDisplay(device.callSign)}</TableCell>
      <TableCell className="font-mono text-sm">{sanitizeForDisplay(device.serialNumber ?? '')}</TableCell>
      <TableCell>{sanitizeForDisplay(device.deviceType ?? '')}</TableCell>
      <TableCell>
        <StatusBadge status={device.status} />
      </TableCell>
    </TableRow>
  );
});

const SKELETON_ROW_COUNT = 5;

/**
 * Read-only admin device table: Rufname, Seriennummer, Gerätetyp, Status.
 */
export function DeviceTable({ devices, isLoading, isFetching }: DeviceTableProps) {
  if (!isLoading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Radio className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
        <p className="text-lg font-medium text-muted-foreground">Keine ausleihbaren Geräte vorhanden</p>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Geräte werden in radio-admin verwaltet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Rufname</TableHead>
            <TableHead className="w-[25%]">Seriennummer</TableHead>
            <TableHead className="w-[25%]">Gerätetyp</TableHead>
            <TableHead className="w-[20%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            [...Array(SKELETON_ROW_COUNT)].map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-28" /></TableCell>
              </TableRow>
            ))}

          {!isLoading &&
            devices.map(device => <DeviceTableRow key={device.id} device={device} />)}
        </TableBody>
      </Table>

      {!isLoading && isFetching && (
        <div
          className="flex items-center justify-center py-4 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
          Aktualisiere...
        </div>
      )}
    </div>
  );
}
