// apps/frontend/src/routes/admin/DeviceManagementIntegration.spec.tsx
// Story 5.4: Admin Geräteverwaltung UI - Integration Tests (CRITICAL #5)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      ...options,
      path,
    }),
  };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Polyfill ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock API hooks - NO mocks of child components!
vi.mock('@/api/admin-devices', () => ({
  useAdminDevices: vi.fn(),
  useCreateDevice: vi.fn(),
  useUpdateDevice: vi.fn(),
  useUpdateDeviceStatus: vi.fn(),
  useDeleteDevice: vi.fn(),
  getDeviceErrorMessage: vi.fn((error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ein Fehler ist aufgetreten';
  }),
  DEVICE_FIELD_LIMITS: {
    CALL_SIGN_MAX: 50,
    SERIAL_NUMBER_MAX: 100,
    DEVICE_TYPE_MAX: 100,
    NOTES_MAX: 500,
  },
  ADMIN_DEVICE_STATUS_OPTIONS: [
    { value: 'AVAILABLE', label: 'Verfügbar' },
    { value: 'DEFECT', label: 'Defekt' },
    { value: 'MAINTENANCE', label: 'Wartung' },
  ],
}));

import { toast } from 'sonner';
import {
  useAdminDevices,
  useCreateDevice,
  useUpdateDevice,
  useUpdateDeviceStatus,
  useDeleteDevice,
} from '@/api/admin-devices';
import type { Device } from '@radio-inventar/shared';

const mockToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
const mockUseAdminDevices = useAdminDevices as ReturnType<typeof vi.fn>;
const mockUseCreateDevice = useCreateDevice as ReturnType<typeof vi.fn>;
const mockUseUpdateDevice = useUpdateDevice as ReturnType<typeof vi.fn>;
const mockUseUpdateDeviceStatus = useUpdateDeviceStatus as ReturnType<typeof vi.fn>;
const mockUseDeleteDevice = useDeleteDevice as ReturnType<typeof vi.fn>;

// Import route component
const DevicesRouteModule = await import('./devices');
const RouteConfig = DevicesRouteModule.Route as unknown as { component: () => JSX.Element };
const AdminDevicesPage = RouteConfig.component;

// Test data
const mockDevice1: Device = {
  id: 'clh8u82zq0000r6j10wxy7k0',
  callSign: 'F4-21',
  status: 'AVAILABLE',
  serialNumber: 'SN001',
  deviceType: 'Handheld',
  notes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockDevice2: Device = {
  id: 'clh8u82zq0001r6j10wxy7k1',
  callSign: 'F4-22',
  status: 'ON_LOAN',
  serialNumber: 'SN002',
  deviceType: 'Mobile',
  notes: 'Test note',
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
};

// Helper to create mock mutation return value
function createMockMutation(overrides: Partial<ReturnType<typeof useCreateDevice>> = {}) {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  };
}

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('CRITICAL #5 - Device Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockUseAdminDevices.mockReturnValue({
      data: [mockDevice1, mockDevice2],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseCreateDevice.mockReturnValue(createMockMutation());
    mockUseUpdateDevice.mockReturnValue(createMockMutation());
    mockUseUpdateDeviceStatus.mockReturnValue(createMockMutation());
    mockUseDeleteDevice.mockReturnValue(createMockMutation());
  });

  describe('Test 1: Complete CRUD Flow', () => {
    it('opens create dialog and submits device', async () => {
      const user = userEvent.setup();
      const mockCreateAsync = vi.fn().mockResolvedValue({
        id: 'new-device-id',
        callSign: 'F4-30',
        status: 'AVAILABLE',
        serialNumber: 'SN999',
        deviceType: 'Portable',
        notes: 'New device',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUseCreateDevice.mockReturnValue(createMockMutation({ mutateAsync: mockCreateAsync }));

      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Step 1: CREATE - Click "Neues Gerät" button in header
      const buttons = screen.getAllByRole('button', { name: /Neues Gerät/i });
      const headerButton = buttons[0]; // First button is in header
      await user.click(headerButton);

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText(/Rufname/), 'F4-30');
      await user.type(screen.getByLabelText('Seriennummer'), 'SN999');
      await user.type(screen.getByLabelText(/Gerätetyp/), 'Portable');
      await user.type(screen.getByLabelText('Notizen'), 'New device');

      // Submit
      const createButton = screen.getByRole('button', { name: 'Erstellen' });
      await user.click(createButton);

      // Verify create was called
      await waitFor(() => {
        expect(mockCreateAsync).toHaveBeenCalledWith({
          callSign: 'F4-30',
          serialNumber: 'SN999',
          deviceType: 'Portable',
          notes: 'New device',
        });
      });

      // Verify success toast
      expect(mockToast.success).toHaveBeenCalledWith('Gerät "F4-30" erfolgreich erstellt');
    });

    it('shows devices in table and opens edit dialog', async () => {
      const user = userEvent.setup();

      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Verify devices are visible
      expect(screen.getByText('F4-21')).toBeInTheDocument();
      expect(screen.getByText('F4-22')).toBeInTheDocument();

      // Find edit button for first device
      const rows = screen.getAllByRole('row');
      const device1Row = rows.find(row => within(row).queryByText('F4-21'));
      expect(device1Row).toBeDefined();

      const editButton = within(device1Row!).getByRole('button', { name: /bearbeiten/i });
      await user.click(editButton);

      // Edit dialog should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('F4-21')).toBeInTheDocument();
      });
    });

    it('opens delete dialog and confirms deletion', async () => {
      const user = userEvent.setup();
      const mockDeleteAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockMutation({ mutateAsync: mockDeleteAsync }));

      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Find delete button for AVAILABLE device (F4-21)
      const rows = screen.getAllByRole('row');
      const device1Row = rows.find(row => within(row).queryByText('F4-21'));
      expect(device1Row).toBeDefined();

      const deleteButton = within(device1Row!).getByRole('button', { name: /löschen/i });
      expect(deleteButton).not.toBeDisabled();

      await user.click(deleteButton);

      // AlertDialog should appear (uses alertdialog role, not dialog)
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      // Find and click confirm button (in AlertDialog it's "Löschen")
      const confirmButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(confirmButton);

      // Verify delete was called
      await waitFor(() => {
        expect(mockDeleteAsync).toHaveBeenCalledWith('clh8u82zq0000r6j10wxy7k0');
      });
    });
  });

  describe('Test 2: Status Change with Toast Feedback', () => {
    it('renders status dropdown for AVAILABLE device', async () => {
      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Find the status select for F4-21 (AVAILABLE device)
      const rows = screen.getAllByRole('row');
      const device1Row = rows.find(row => within(row).queryByText('F4-21'));
      expect(device1Row).toBeDefined();

      // Status dropdown should be present for AVAILABLE device
      const statusTrigger = within(device1Row!).getByRole('combobox', {
        name: /Status ändern für F4-21/i,
      });
      expect(statusTrigger).toBeInTheDocument();
      expect(statusTrigger).not.toBeDisabled();
    });

    it('does not render status dropdown for ON_LOAN device', async () => {
      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Find ON_LOAN device row (F4-22)
      const rows = screen.getAllByRole('row');
      const onLoanRow = rows.find(row => within(row).queryByText('F4-22'));
      expect(onLoanRow).toBeDefined();

      // ON_LOAN device should show badge only, no dropdown
      const statusBadge = within(onLoanRow!).getByText(/Ausgeliehen/i);
      expect(statusBadge).toBeInTheDocument();

      // No combobox should be present
      const combobox = within(onLoanRow!).queryByRole('combobox');
      expect(combobox).not.toBeInTheDocument();
    });
  });

  describe('Test 3: ON_LOAN Delete Protection', () => {
    it('disables delete button for ON_LOAN device', () => {
      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Find ON_LOAN device row (F4-22)
      const rows = screen.getAllByRole('row');
      const onLoanRow = rows.find(row => within(row).queryByText('F4-22'));
      expect(onLoanRow).toBeDefined();

      // Delete button should be disabled
      const deleteButton = within(onLoanRow!).getByRole('button', { name: /löschen/i });
      expect(deleteButton).toBeDisabled();

      // Button should have min-h-16 for touch target (64px)
      expect(deleteButton).toHaveClass('min-h-16');
    });

    it('allows delete for AVAILABLE device', () => {
      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Find AVAILABLE device row (F4-21)
      const rows = screen.getAllByRole('row');
      const availableRow = rows.find(row => within(row).queryByText('F4-21'));
      expect(availableRow).toBeDefined();

      // Delete button should be enabled
      const deleteButton = within(availableRow!).getByRole('button', { name: /löschen/i });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Test 4: Error Handling with Retry', () => {
    it('shows error fallback when API fails', () => {
      const mockRefetch = vi.fn();

      // Mock API error - ErrorBoundary will catch it
      mockUseAdminDevices.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: new Error('Server error'),
        refetch: mockRefetch,
      });

      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Error fallback should be visible (caught by ErrorBoundary)
      expect(screen.getByRole('heading', { name: /Fehler beim Laden/i })).toBeInTheDocument();
      expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();

      // Retry button should be present
      const retryButton = screen.getByRole('button', { name: /Erneut versuchen/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveClass('min-h-16'); // Touch-optimized (64px)
    });

    it('shows error toast when create fails and keeps dialog open', async () => {
      const user = userEvent.setup();
      const mockCreateAsync = vi.fn().mockRejectedValue(new Error('Funkruf existiert bereits'));

      mockUseCreateDevice.mockReturnValue(createMockMutation({ mutateAsync: mockCreateAsync }));

      render(<AdminDevicesPage />, { wrapper: createWrapper() });

      // Open create dialog
      const buttons = screen.getAllByRole('button', { name: /Neues Gerät/i });
      await user.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill and submit
      await user.type(screen.getByLabelText(/Rufname/), 'F4-21'); // Duplicate
      await user.type(screen.getByLabelText(/Gerätetyp/), 'Funkgerät');

      const createButton = screen.getByRole('button', { name: 'Erstellen' });
      await user.click(createButton);

      // Wait for error
      await waitFor(() => {
        expect(mockCreateAsync).toHaveBeenCalled();
      });

      // Error toast should appear with retry option
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Funkruf existiert bereits',
          expect.objectContaining({
            duration: 5000,
            action: expect.objectContaining({
              label: 'Erneut versuchen',
            }),
          })
        );
      });

      // Dialog should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
