// apps/frontend/src/routes/admin/devices.tsx
// Story 5.4: Admin Geräteverwaltung UI - Devices Page
// Story 6.5: Added PrintTemplateButton for PDF print template download
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { DeviceTable } from '@/components/features/admin/DeviceTable';
import { DeviceFormDialog } from '@/components/features/admin/DeviceFormDialog';
import { DeviceDeleteDialog } from '@/components/features/admin/DeviceDeleteDialog';
import { PrintTemplateButton } from '@/components/features/admin/PrintTemplateButton';
import { useAdminDevices, type Device } from '@/api/admin-devices';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Admin devices route (protected by parent admin route guard).
 * AC1: Device list view at /admin/devices
 */
export const Route = createFileRoute('/admin/devices')({
  component: AdminDevicesPage,
});

/**
 * Error fallback component for the devices page.
 * AC8: Error handling with retry option
 */
function DevicesErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const errorMessage = getUserFriendlyErrorMessage(error);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Fehler beim Laden</h2>
        <p className="text-muted-foreground max-w-md">{errorMessage}</p>
      </div>
      <Button onClick={resetErrorBoundary} className="min-h-16">
        <RefreshCw className="mr-2 h-4 w-4" />
        Erneut versuchen
      </Button>
    </div>
  );
}

/**
 * Main devices page component with table and dialogs.
 * AC1-AC8: Full CRUD interface for device management
 */
function AdminDevicesPage() {
  return (
    <ErrorBoundary FallbackComponent={DevicesErrorFallback}>
      <DevicesContent />
    </ErrorBoundary>
  );
}

/**
 * Inner content component (allows error boundary to catch errors).
 * FIX MEDIUM #4: Async error handling via React Query error state
 */
function DevicesContent() {
  // Dialog state management (Task 5.3)
  // Fix #7: Use single selectedDevice with mode instead of separate deviceToDelete
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(undefined);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Query state
  // FIX MEDIUM #4: Async Error Handling Strategy
  // React Query handles async errors via isError state. We have two patterns:
  //
  // 1. QUERY ERRORS (useAdminDevices):
  //    - Thrown synchronously during render phase
  //    - Error Boundary catches and displays DevicesErrorFallback
  //    - User can retry via resetErrorBoundary
  //
  // 2. MUTATION ERRORS (create/update/delete in child components):
  //    - Handled in component-level try/catch blocks
  //    - Displayed as error toasts with retry action
  //    - Dialog stays open for user correction
  //
  // This separation ensures:
  // - Queries (page-level failures) → Full error boundary UI
  // - Mutations (action failures) → Contextual inline errors
  const { data: devices = [], isLoading, isFetching, refetch, isError, error } = useAdminDevices();

  if (isError) {
    throw error; // Thrown in render → Error Boundary catches
  }

  // Handlers
  const handleAddNew = () => {
    setSelectedDevice(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setIsFormOpen(true);
  };

  const handleDelete = (device: Device) => {
    // Fix #7: Reuse selectedDevice for delete operations
    setSelectedDevice(device);
    setIsDeleteOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedDevice(undefined);
    }
  };

  const handleDeleteClose = (open: boolean) => {
    setIsDeleteOpen(open);
    if (!open) {
      setSelectedDevice(undefined);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      // Error boundary will catch this
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (Task 5.2, Story 6.5) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Geräteverwaltung</h1>
        <div className="flex items-center gap-2">
          {/* Story 6.5: Print template button - AC1 */}
          <PrintTemplateButton disabled={isFetching} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            className="min-h-16 min-w-16"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleAddNew} className="min-h-16">
            <Plus className="mr-2 h-4 w-4" />
            Neues Gerät
          </Button>
        </div>
      </div>

      {/* Device Table (Task 5.2) */}
      {/* MEDIUM #5: Wrap DeviceTable in ErrorBoundary for table-level errors */}
      <ErrorBoundary FallbackComponent={DevicesErrorFallback}>
        <DeviceTable
          devices={devices}
          isLoading={isLoading}
          isFetching={isFetching}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
        />
      </ErrorBoundary>

      {/* Form Dialog for Create/Edit (Task 5.3) */}
      <DeviceFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        device={selectedDevice}
      />

      {/* Delete Confirmation Dialog (Task 5.3) */}
      {/* Fix #7: Use selectedDevice for delete dialog */}
      {selectedDevice && isDeleteOpen && (
        <DeviceDeleteDialog
          open={isDeleteOpen}
          onOpenChange={handleDeleteClose}
          device={selectedDevice}
        />
      )}
    </div>
  );
}
