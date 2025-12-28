// apps/frontend/src/components/features/admin/DeviceTable.tsx
// Story 5.4: Admin Geräteverwaltung UI - Device Table Component
// ARCHITECTURE FIX #1: Renamed from AdminDeviceTable.tsx to DeviceTable.tsx
// Folder context (admin/) already provides namespace, no need to repeat in filename

import { useState, memo, useCallback, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/features/StatusBadge';
import {
  useUpdateDeviceStatus,
  ADMIN_DEVICE_STATUS_OPTIONS,
  type Device,
  type AdminDeviceStatus,
  getDeviceErrorMessage,
} from '@/api/admin-devices';
import { Pencil, Trash2, Plus, Radio, Loader2 } from 'lucide-react';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { toast } from 'sonner';

interface DeviceTableProps {
  devices: Device[];
  isLoading: boolean;
  isFetching: boolean;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onAddNew: () => void;
}

interface DeviceTableRowProps {
  device: Device;
  isUpdating: boolean;
  isFetching: boolean;
  onStatusChange: (deviceId: string, deviceName: string, newStatus: AdminDeviceStatus) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}

/**
 * Memoized device table row component
 * PERFORMANCE FIX #4: Prevents unnecessary re-renders when other rows update
 * Only re-renders when device props or updating state changes
 */
const DeviceTableRow = memo(function DeviceTableRow({
  device,
  isUpdating,
  isFetching,
  onStatusChange,
  onEdit,
  onDelete,
}: DeviceTableRowProps) {
  const isDeletable = device.status !== 'ON_LOAN';
  const isStatusDisabled = device.status === 'ON_LOAN' || isUpdating;

  // HIGH FIX #5: Memoize sanitization to avoid N+1 problem (600+ calls for 100 devices)
  // Only re-sanitize when device data actually changes
  const sanitizedCallSign = useMemo(() => sanitizeForDisplay(device.callSign), [device.callSign]);
  const sanitizedSerialNumber = useMemo(() => sanitizeForDisplay(device.serialNumber ?? ''), [device.serialNumber]);
  const sanitizedDeviceType = useMemo(() => sanitizeForDisplay(device.deviceType), [device.deviceType]);

  return (
    <TableRow>
      {/* Rufname */}
      <TableCell className="font-medium">
        {sanitizedCallSign}
      </TableCell>

      {/* Seriennummer */}
      <TableCell className="font-mono text-sm">
        {sanitizedSerialNumber}
      </TableCell>

      {/* Gerätetyp */}
      <TableCell>{sanitizedDeviceType}</TableCell>

      {/* Status - Dropdown or Badge */}
      <TableCell>
        {device.status === 'ON_LOAN' ? (
          /* AC2: ON_LOAN devices show badge only (no dropdown) */
          <StatusBadge status={device.status} />
        ) : (
          /* AC2: Status dropdown for AVAILABLE, DEFECT, MAINTENANCE */
          /* MEDIUM FIX #31: gap-2 (8px) → gap-4 (16px) for optimal touch spacing */
          <div className="flex items-center gap-4">
            {isUpdating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            <Select
              value={device.status}
              onValueChange={(value: AdminDeviceStatus) => onStatusChange(device.id, device.callSign, value)}
              disabled={isStatusDisabled}
            >
              <SelectTrigger
                className="w-[140px] min-h-16"
                aria-label={`Status ändern für ${sanitizedCallSign}`}
                aria-disabled={isStatusDisabled}
                aria-busy={isUpdating}
              >
                <SelectValue>
                  <StatusBadge status={device.status} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ADMIN_DEVICE_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} className="min-h-16">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </TableCell>

      {/* Aktionen - Edit & Delete buttons */}
      <TableCell>
        {/* MEDIUM FIX #31: gap-2 (8px) → gap-4 (16px) for optimal touch spacing */}
        <div className="flex justify-end gap-4">
          {/* AC3: Edit button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(device)}
            disabled={isUpdating || isFetching}
            className="min-h-16 min-w-16"
            aria-label={`${sanitizedCallSign} bearbeiten`}
            aria-disabled={isUpdating || isFetching}
            aria-busy={isUpdating}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* AC3: Delete button with tooltip for ON_LOAN */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDelete(device)}
                    disabled={!isDeletable || isUpdating || isFetching}
                    className="min-h-16 min-w-16"
                    aria-label={`${sanitizedCallSign} löschen`}
                    aria-disabled={!isDeletable || isUpdating || isFetching}
                    aria-busy={isUpdating}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!isDeletable && (
                <TooltipContent>
                  <p>Ausgeliehenes Gerät kann nicht gelöscht werden</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
});

/**
 * Admin device table with inline status changes and row actions
 *
 * Features:
 * - AC1: Tabular device list with columns: Rufname, Seriennummer, Gerätetyp, Status, Aktionen
 * - AC2: Status dropdown per row (disabled for ON_LOAN devices)
 * - AC3: Edit/Delete action buttons (delete disabled for ON_LOAN)
 * - AC4: Loading states during mutations
 * - AC5: Empty state with "Neues Gerät" button
 * - AC6: Skeleton loading state
 * - AC7: Touch-optimized buttons (min-h-16 = 64px)
 * - AC8: XSS protection via sanitizeForDisplay
 *
 * ARCHITECTURE FIX #6: Extracted DeviceTableRow sub-component to reduce complexity
 */
// LOW #8: Extract magic number to named constant
const SKELETON_ROW_COUNT = 5;

export function DeviceTable({
  devices,
  isLoading,
  isFetching,
  onEdit,
  onDelete,
  onAddNew,
}: DeviceTableProps) {
  const updateStatus = useUpdateDeviceStatus();
  const [updatingDeviceId, setUpdatingDeviceId] = useState<string | null>(null);

  /**
   * Handle status change via dropdown
   * AC2: Optimistic update with loading state
   * CRITICAL FIX #2 & #3: Added error handling and feedback
   * PERFORMANCE FIX #4: useCallback to prevent DeviceTableRow re-renders
   * Note: Removed isMountedRef check - React 18+ handles this automatically
   */
  const handleStatusChange = useCallback(async (deviceId: string, deviceName: string, newStatus: AdminDeviceStatus) => {
    setUpdatingDeviceId(deviceId);
    try {
      await updateStatus.mutateAsync({ id: deviceId, status: newStatus });
      toast.success(`Status von "${sanitizeForDisplay(deviceName)}" aktualisiert`);
    } catch (error) {
      const errorMessage = getDeviceErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setUpdatingDeviceId(null);
    }
  }, [updateStatus.mutateAsync]);


  /**
   * Empty state
   * AC5: Show when no devices exist
   */
  if (!isLoading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Radio className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
        <p className="text-lg font-medium text-muted-foreground mb-6">Keine Geräte vorhanden</p>
        <Button onClick={onAddNew} size="lg" className="min-h-16">
          <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
          Neues Gerät
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%]">Rufname</TableHead>
            <TableHead className="w-[25%]">Seriennummer</TableHead>
            <TableHead className="w-[20%]">Gerätetyp</TableHead>
            <TableHead className="w-[15%]">Status</TableHead>
            <TableHead className="w-[15%] text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* AC6: Skeleton loading state */}
          {isLoading && (
            <>
              {[...Array(SKELETON_ROW_COUNT)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-28" />
                  </TableCell>
                  <TableCell>
                    {/* MEDIUM FIX #31: gap-2 (8px) → gap-4 (16px) for optimal touch spacing */}
                    <div className="flex justify-end gap-4">
                      <Skeleton className="h-16 w-16" />
                      <Skeleton className="h-16 w-16" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}

          {/* AC1: Device rows - PERFORMANCE FIX #4: Use memoized row component */}
          {!isLoading &&
            devices.map(device => (
              <DeviceTableRow
                key={device.id}
                device={device}
                isUpdating={updatingDeviceId === device.id}
                isFetching={isFetching}
                onStatusChange={handleStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
        </TableBody>
      </Table>

      {/* Background fetching indicator */}
      {/* LOW #9: Add ARIA live region for screen reader announcements */}
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
