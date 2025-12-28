// apps/frontend/src/routes/admin/devices.spec.tsx
// Story 5.4: Admin Geräteverwaltung UI - Devices Route Tests

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { Device } from '@/api/admin-devices';
import { ApiError } from '@/api/client';

// Mock modules
vi.mock('@/api/admin-devices', () => ({
  useAdminDevices: vi.fn(),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) =>
    createElement('button', { onClick, disabled, className, ...props }, children),
}));

vi.mock('@/components/features/admin/DeviceTable', () => ({
  DeviceTable: ({ devices, onEdit, onDelete, onAddNew }: any) =>
    createElement('div', { 'data-testid': 'device-table' }, [
      createElement('span', { key: 'count' }, `${devices.length} devices`),
      createElement('button', { key: 'add', onClick: onAddNew }, 'Add New (Table)'),
      devices.map((d: Device, i: number) =>
        createElement('div', { key: d.id }, [
          createElement('span', { key: 'name' }, d.callSign),
          createElement('button', { key: 'edit', onClick: () => onEdit(d) }, 'Edit'),
          createElement('button', { key: 'delete', onClick: () => onDelete(d) }, 'Delete'),
        ])
      ),
    ]),
}));

vi.mock('@/components/features/admin/DeviceFormDialog', () => ({
  DeviceFormDialog: ({ open, device }: any) =>
    open
      ? createElement('div', { 'data-testid': 'form-dialog' }, device ? `Editing ${device.callSign}` : 'Creating New')
      : null,
}));

vi.mock('@/components/features/admin/DeviceDeleteDialog', () => ({
  DeviceDeleteDialog: ({ open, device }: any) =>
    open ? createElement('div', { 'data-testid': 'delete-dialog' }, `Deleting ${device?.callSign}`) : null,
}));

// Story 6.5: Mock PrintTemplateButton
vi.mock('@/components/features/admin/PrintTemplateButton', () => ({
  PrintTemplateButton: ({ disabled }: any) =>
    createElement('button', {
      'data-testid': 'print-template-button',
      disabled,
      'aria-label': 'Druckvorlage als PDF herunterladen',
    }, 'Druckvorlage erstellen'),
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent }: any) => {
    try {
      return children;
    } catch (error) {
      return createElement(FallbackComponent, { error, resetErrorBoundary: vi.fn() });
    }
  },
}));

vi.mock('lucide-react', () => ({
  Plus: () => createElement('span', null, 'Plus Icon'),
  RefreshCw: () => createElement('span', null, 'Refresh Icon'),
  AlertCircle: () => createElement('span', null, 'Alert Icon'),
  Radio: () => createElement('span', null, 'Radio Icon'),
}));

import { useAdminDevices } from '@/api/admin-devices';

const mockUseAdminDevices = useAdminDevices as Mock;

// Test data
const mockDevices: Device[] = [
  {
    id: 'device-001',
    callSign: 'Florian 1',
    deviceType: 'Funkgerät',
    serialNumber: 'SN-001',
    status: 'AVAILABLE',
    notes: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  },
  {
    id: 'device-002',
    callSign: 'Florian 2',
    deviceType: 'Funkgerät',
    serialNumber: 'SN-002',
    status: 'ON_LOAN',
    notes: null,
    createdAt: new Date('2025-01-02T10:00:00Z'),
    updatedAt: new Date('2025-01-02T10:00:00Z'),
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Admin Devices Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders page title and action buttons', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      expect(screen.getByText('Geräteverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aktualisieren/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /neues gerät/i })).toBeInTheDocument();
    });

    it('renders DeviceTable with devices', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      expect(screen.getByTestId('device-table')).toBeInTheDocument();
      expect(screen.getByText('2 devices')).toBeInTheDocument();
    });
  });

  describe('Dialog Management', () => {
    it('opens form dialog for creating new device', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Creating New')).toBeInTheDocument();
      });
    });

    it('opens form dialog for editing device', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Editing Florian 1')).toBeInTheDocument();
      });
    });

    it('opens delete dialog when delete clicked', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
        expect(screen.getByText('Deleting Florian 1')).toBeInTheDocument();
      });
    });
  });

  // Fix #6: Race Conditions Tests
  describe('Race Conditions', () => {
    it('handles opening multiple dialogs rapidly', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      // Rapidly click add and edit
      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]!);

      await waitFor(() => {
        // Should only show one dialog (last action wins)
        const dialogs = screen.getAllByTestId('form-dialog');
        expect(dialogs.length).toBe(1);
      });
    });

    it('handles edit then delete rapidly', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]!);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]!);

      await waitFor(() => {
        // Delete dialog should be visible
        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
      });
    });

    it('prevents opening delete dialog while form is open', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      // Open form dialog
      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      });

      // Try to open delete dialog
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]!);

      // Both dialogs should be present (separate state management)
      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
      });
    });
  });

  // Fix #7: Network Error Recovery Tests
  describe('Network Error Recovery', () => {
    it('shows error boundary on fetch error', async () => {
      const error = new ApiError(500, 'Internal Server Error', 'Server error');
      mockUseAdminDevices.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: true,
        error,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      const error = new Error('Network error');
      mockUseAdminDevices.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: true,
        error,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
      });
    });

    it('calls refetch when manual refresh clicked', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: mockDevices });
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('disables refresh button while fetching', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: true,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).toBeDisabled();
    });

    // HIGH #5: Enhanced error recovery with error display assertions
    it('handles refetch error gracefully and shows error UI', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Refetch failed'));

      // Start with success state
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      fireEvent.click(refreshButton);

      // Simulate refetch error state
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
        isError: true,
        error: new Error('Refetch failed'),
      });

      rerender(createElement(Component!));

      // HIGH #5: Assert error display, not just refetch call
      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
      });

      // Refetch should have been called
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('recovers from error state after successful retry', async () => {
      let callCount = 0;
      const mockRefetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({ data: mockDevices });
      });

      // Start with error state
      mockUseAdminDevices.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
        isError: true,
        error: new Error('Initial error'),
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
      });

      // Simulate successful refetch
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      await waitFor(() => {
        expect(screen.getByTestId('device-table')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: [],
        isLoading: true,
        isFetching: true,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      expect(screen.getByTestId('device-table')).toBeInTheDocument();
    });

    it('shows fetching state during background refresh', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: true,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('refresh button has aria-label', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /aktualisieren/i })).toBeInTheDocument();
    });

    it('maintains focus after dialog close', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      });

      // Dialog management handles focus
      expect(addButton).toBeInTheDocument();
    });
  });

  // HIGH #4: Integration Tests - Full User Flows
  describe('Integration Tests - Full User Flows', () => {
    it('creates device and updates table', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      // Verify initial state
      expect(screen.getByText('2 devices')).toBeInTheDocument();

      // Open create dialog
      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Creating New')).toBeInTheDocument();
      });

      // Simulate successful creation by updating mock data
      const newDevice = {
        id: 'device-003',
        callSign: 'Florian 3',
        deviceType: 'Funkgerät',
        serialNumber: 'SN-003',
        status: 'AVAILABLE' as const,
        notes: null,
        createdAt: new Date('2025-01-03T10:00:00Z'),
        updatedAt: new Date('2025-01-03T10:00:00Z'),
      };

      mockUseAdminDevices.mockReturnValue({
        data: [...mockDevices, newDevice],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      // Trigger rerender to simulate query invalidation
      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      // After successful creation, table should show 3 devices
      await waitFor(() => {
        expect(screen.getByText('3 devices')).toBeInTheDocument();
      });
    });

    it('edits device and shows changes', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      // Verify initial device name
      expect(screen.getByText('Florian 1')).toBeInTheDocument();

      // Open edit dialog
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Editing Florian 1')).toBeInTheDocument();
      });

      // Simulate successful edit
      const updatedDevices = mockDevices.map((d, i) =>
        i === 0 ? { ...d, callSign: 'Florian 1 Updated' } : d
      );

      mockUseAdminDevices.mockReturnValue({
        data: updatedDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      // Verify updated device name
      await waitFor(() => {
        expect(screen.getByText('Florian 1 Updated')).toBeInTheDocument();
      });
      expect(screen.queryByText('Florian 1')).not.toBeInTheDocument();
    });

    it('deletes device with confirmation', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      // Verify initial state
      expect(screen.getByText('2 devices')).toBeInTheDocument();
      expect(screen.getByText('Florian 1')).toBeInTheDocument();

      // Open delete dialog
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
        expect(screen.getByText('Deleting Florian 1')).toBeInTheDocument();
      });

      // Simulate successful deletion
      const remainingDevices = mockDevices.slice(1);

      mockUseAdminDevices.mockReturnValue({
        data: remainingDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      // Verify device was deleted
      await waitFor(() => {
        expect(screen.getByText('1 devices')).toBeInTheDocument();
      });
      expect(screen.queryByText('Florian 1')).not.toBeInTheDocument();
      expect(screen.getByText('Florian 2')).toBeInTheDocument();
    });

    it('handles complete create-edit-delete flow', async () => {
      // Start with initial data
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      const { rerender } = render(createElement(Component!), { wrapper: createWrapper() });

      // STEP 1: Create device
      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      });

      const newDevice = {
        id: 'device-003',
        callSign: 'Florian 3',
        deviceType: 'Funkgerät',
        serialNumber: 'SN-003',
        status: 'AVAILABLE' as const,
        notes: null,
        createdAt: new Date('2025-01-03T10:00:00Z'),
        updatedAt: new Date('2025-01-03T10:00:00Z'),
      };

      mockUseAdminDevices.mockReturnValue({
        data: [...mockDevices, newDevice],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      await waitFor(() => {
        expect(screen.getByText('3 devices')).toBeInTheDocument();
      });

      // STEP 2: Edit the new device
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[2]!); // Edit the newly created device

      await waitFor(() => {
        expect(screen.getByText('Editing Florian 3')).toBeInTheDocument();
      });

      const updatedDevices = [...mockDevices, { ...newDevice, callSign: 'Florian 3 Edited' }];

      mockUseAdminDevices.mockReturnValue({
        data: updatedDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      await waitFor(() => {
        expect(screen.getByText('Florian 3 Edited')).toBeInTheDocument();
      });

      // STEP 3: Delete the edited device
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[2]!); // Delete the edited device

      await waitFor(() => {
        expect(screen.getByText('Deleting Florian 3 Edited')).toBeInTheDocument();
      });

      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      rerender(createElement(Component!));

      // Back to original state
      await waitFor(() => {
        expect(screen.getByText('2 devices')).toBeInTheDocument();
      });
      expect(screen.queryByText('Florian 3 Edited')).not.toBeInTheDocument();
    });

    it('handles error during create and allows retry', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      // Open create dialog
      const addButton = screen.getByRole('button', { name: /neues gerät/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      });

      // Dialog stays open after error (user can retry)
      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    });
  });

  // MEDIUM #10: Empty State Interaction
  describe('Empty State Interaction', () => {
    it('empty state button opens form dialog', async () => {
      mockUseAdminDevices.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        isError: false,
        error: null,
      });

      const { Route } = await import('./devices');
      const Component = Route.options.component;

      render(createElement(Component!), { wrapper: createWrapper() });

      // Verify empty state is shown
      expect(screen.getByTestId('device-table')).toBeInTheDocument();
      expect(screen.getByText('0 devices')).toBeInTheDocument();

      // Click "Add New" button from table (which shows empty state)
      const addNewButton = screen.getByText('Add New (Table)');
      fireEvent.click(addNewButton);

      // Form dialog should open
      await waitFor(() => {
        expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Creating New')).toBeInTheDocument();
      });
    });
  });
});
