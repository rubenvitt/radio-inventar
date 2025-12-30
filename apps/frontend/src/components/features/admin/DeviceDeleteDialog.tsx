import { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useDeleteDevice, getDeviceErrorMessage, type Device } from '@/api/admin-devices';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeviceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
}

/**
 * AlertDialog for deleting a device with confirmation.
 * Story 5.4: Admin Geräteverwaltung UI - Delete Dialog
 *
 * Features:
 * - AC5: Destructive confirmation dialog pattern
 * - AC6: Shows device callSign prominently
 * - AC7: Warning text about irreversible action
 * - AC8: Special handling for 409 ON_LOAN conflict error
 * - AC9: Touch-optimized buttons (min-h-16)
 * - AC10: Loading state during deletion
 * - AC11: Success toast and dialog close on success
 * - AC12: Error handling with retry option
 *
 * @example
 * <DeviceDeleteDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   device={selectedDevice}
 * />
 */
export const DeviceDeleteDialog = memo(function DeviceDeleteDialog({
  open,
  onOpenChange,
  device,
}: DeviceDeleteDialogProps) {
  const deleteDevice = useDeleteDevice();
  const isOnLoan = device.status === 'ON_LOAN';

  const handleDelete = async () => {
    try {
      // Use force=true for ON_LOAN devices
      await deleteDevice.mutateAsync({ id: device.id, force: isOnLoan });

      // AC11: Success toast
      toast.success(`Gerät "${sanitizeForDisplay(device.callSign)}" wurde gelöscht`);

      // AC11: Close dialog on success
      onOpenChange(false);
    } catch (error) {
      // FIX MEDIUM #4: Mutation errors handled inline with toast + retry
      // MEDIUM #7: Use context-aware error message
      const errorMessage = getDeviceErrorMessage(error, 'delete');

      // AC12: Network errors with retry option
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Erneut versuchen',
          onClick: () => {
            // Prevent infinite retry loop by checking if mutation is already pending
            if (!deleteDevice.isPending) {
              handleDelete();
            }
          },
        },
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Gerät "{sanitizeForDisplay(device.callSign)}" löschen?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isOnLoan && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      Achtung: Dieses Gerät ist aktuell ausgeliehen!
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Das Löschen entfernt auch die aktive Ausleihe und den gesamten Verlauf dieses Geräts.
                    </p>
                  </div>
                </div>
              )}
              <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteDevice.isPending}
            className="min-h-16"
          >
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteDevice.isPending}
            className="min-h-16 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteDevice.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {deleteDevice.isPending ? 'Wird gelöscht...' : 'Löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
