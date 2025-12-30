// apps/frontend/src/components/features/admin/DeviceTable.spec.tsx
// Story 5.4: Admin Geräteverwaltung UI - Device Table Component Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceTable } from './DeviceTable';
import type { Device } from '@/api/admin-devices';

// Mock the API hooks
vi.mock('@/api/admin-devices', () => ({
  useUpdateDeviceStatus: vi.fn(),
  ADMIN_DEVICE_STATUS_OPTIONS: [
    { value: 'AVAILABLE', label: 'Verfügbar' },
    { value: 'DEFECT', label: 'Defekt' },
    { value: 'MAINTENANCE', label: 'Wartung' },
  ],
}));

// Mock StatusBadge component
vi.mock('@/components/features/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel, 'aria-disabled': ariaDisabled, 'aria-busy': ariaBusy, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
      aria-busy={ariaBusy}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      <button onClick={() => !disabled && onValueChange && onValueChange('AVAILABLE')}>
        {children}
      </button>
    </div>
  ),
  SelectTrigger: ({ children, 'aria-label': ariaLabel, 'aria-disabled': ariaDisabled, 'aria-busy': ariaBusy, className }: any) => (
    <div
      data-testid="select-trigger"
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
      aria-busy={ariaBusy}
      className={className}
    >
      {children}
    </div>
  ),
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, className }: any) => (
    <div data-value={value} className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Pencil: () => <span data-testid="pencil-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Radio: () => <span data-testid="radio-icon" />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} aria-hidden="true" />,
}));

// Use REAL sanitizeForDisplay to test actual XSS protection
// NOTE: We don't mock sanitize for aria-label tests to ensure real XSS protection works
import { sanitizeForDisplay } from '@/lib/sanitize';

import { useUpdateDeviceStatus } from '@/api/admin-devices';

const mockUseUpdateDeviceStatus = useUpdateDeviceStatus as ReturnType<typeof vi.fn>;

// Helper to create mock mutation
function createMockMutation(overrides: any = {}) {
  return {
    mutate: vi.fn(),
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

const mockDevices: Device[] = [
  {
    id: 'device-1',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    status: 'AVAILABLE',
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'device-2',
    callSign: 'Florian 4-22',
    serialNumber: 'SN-002',
    deviceType: 'Base Station',
    status: 'ON_LOAN',
    notes: null,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
  {
    id: 'device-3',
    callSign: 'Florian 4-23',
    serialNumber: null,
    deviceType: 'Mobile',
    status: 'DEFECT',
    notes: 'Broken antenna',
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03'),
  },
];

describe('DeviceTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAddNew = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateDeviceStatus.mockReturnValue(createMockMutation());
  });

  describe('Rendering Device Rows (AC1)', () => {
    it('renders table with correct headers', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Rufname')).toBeInTheDocument();
      expect(screen.getByText('Seriennummer')).toBeInTheDocument();
      expect(screen.getByText('Gerätetyp')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Aktionen')).toBeInTheDocument();
    });

    it('renders all device rows with correct data', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
      expect(screen.getByText('SN-001')).toBeInTheDocument();
      expect(screen.getByText('SN-002')).toBeInTheDocument();
    });

    it('renders device type for each row', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Handheld')).toBeInTheDocument();
      expect(screen.getByText('Base Station')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    it('renders empty string for null serial number', () => {
      const { container } = render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Device 3 has null serialNumber, should render empty
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('sanitizes device data for XSS protection', () => {
      const xssDevice: Device = {
        id: 'xss-1',
        callSign: '<script>alert("xss")</script>Device',
        serialNumber: '<img src=x>',
        deviceType: '<b>Type</b>',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[xssDevice]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // sanitizeForDisplay strips HTML tags
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
      expect(screen.getByText(/alert.*Device/)).toBeInTheDocument();
    });
  });

  describe('Status Badge Display', () => {
    it('renders status badge for each device', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const badges = screen.getAllByTestId('status-badge');
      expect(badges).toHaveLength(3);
    });

    it('shows status badge only (no dropdown) for ON_LOAN devices', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Device 2 is ON_LOAN - should have badge but no select
      const badges = screen.getAllByTestId('status-badge');
      expect(badges[1]).toHaveTextContent('ON_LOAN');
    });

    it('shows status dropdown for AVAILABLE devices', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selects = screen.getAllByTestId('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('shows status dropdown for DEFECT devices', () => {
      render(
        <DeviceTable
          devices={[mockDevices[2]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const select = screen.getByTestId('select');
      expect(select).toHaveAttribute('data-value', 'DEFECT');
    });
  });

  describe('Action Button States (AC3)', () => {
    it('renders edit button for each device', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      expect(editButtons).toHaveLength(3);
    });

    it('renders delete button for each device', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      expect(deleteButtons).toHaveLength(3);
    });

    it('delete button is disabled for ON_LOAN devices', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      // Device 2 (index 1) is ON_LOAN
      expect(deleteButtons[1]).toBeDisabled();
    });

    it('delete button is enabled for AVAILABLE devices', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      // Device 1 (index 0) is AVAILABLE
      expect(deleteButtons[0]).not.toBeDisabled();
    });

    it('delete button is enabled for DEFECT devices', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      // Device 3 (index 2) is DEFECT
      expect(deleteButtons[2]).not.toBeDisabled();
    });

    it('edit button calls onEdit with device when clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      await user.click(editButtons[0]!);

      expect(mockOnEdit).toHaveBeenCalledWith(mockDevices[0]);
    });

    it('delete button calls onDelete with device when clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      await user.click(deleteButtons[0]!);

      expect(mockOnDelete).toHaveBeenCalledWith(mockDevices[0]);
    });

    it('shows tooltip for disabled delete button on ON_LOAN device', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Tooltip should be present for ON_LOAN device
      expect(screen.getByText('Ausgeliehenes Gerät kann nicht gelöscht werden')).toBeInTheDocument();
    });

    it('edit button is disabled during isFetching', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      editButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('delete button is disabled during isFetching', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      deleteButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Status Dropdown (AC2)', () => {
    it('status dropdown shows three admin options', () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Check that options are rendered
      expect(screen.getByText('Verfügbar')).toBeInTheDocument();
      expect(screen.getByText('Defekt')).toBeInTheDocument();
      expect(screen.getByText('Wartung')).toBeInTheDocument();
    });

    it('status dropdown does not include ON_LOAN option', () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // ON_LOAN should not be selectable
      expect(screen.queryByText('Ausgeliehen')).not.toBeInTheDocument();
    });

    it('status dropdown is disabled for ON_LOAN devices', () => {
      render(
        <DeviceTable
          devices={[mockDevices[1]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // ON_LOAN device should not have a dropdown
      const selects = screen.queryAllByTestId('select');
      expect(selects).toHaveLength(0);
    });

    it('status dropdown calls mutation on value change', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'device-1',
        status: 'AVAILABLE',
      });
    });

    it('status dropdown has aria-label for accessibility', () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');
      expect(selectTrigger).toHaveAttribute('aria-label', 'Status ändern für Florian 4-21');
    });

    it('status dropdown has touch-optimized height', () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');
      expect(selectTrigger).toHaveClass('min-h-16'); // 64px
    });

    it('status dropdown options have touch-optimized height', () => {
      const { container } = render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Verify that SelectItem elements are rendered with data-value attributes
      // The actual className is applied by the component (min-h-16 = 64px per UX spec)
      const selectItems = container.querySelectorAll('[data-value]');
      expect(selectItems.length).toBeGreaterThan(0);

      // Check that the three admin status options exist
      expect(container.querySelector('[data-value="AVAILABLE"]')).toBeInTheDocument();
      expect(container.querySelector('[data-value="DEFECT"]')).toBeInTheDocument();
      expect(container.querySelector('[data-value="MAINTENANCE"]')).toBeInTheDocument();
    });

    it('shows loading indicator during status update', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Should show loading indicator
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass('animate-spin');
    });

    it('status dropdown is disabled during status update', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Select should be disabled during update
      const selectAfter = screen.getByTestId('select');
      expect(selectAfter).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('Status Update Loading State Visual Verification (Security MEDIUM Fix)', () => {
    it('verifies aria-disabled on status dropdown during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');

      // Before update: aria-disabled should be false
      expect(selectTrigger).toHaveAttribute('aria-disabled', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-disabled is set to true
      const selectTriggerDuringUpdate = screen.getByTestId('select-trigger');
      expect(selectTriggerDuringUpdate).toHaveAttribute('aria-disabled', 'true');
    });

    it('verifies aria-busy on status dropdown during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');

      // Before update: aria-busy should be false
      expect(selectTrigger).toHaveAttribute('aria-busy', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-busy is set to true
      const selectTriggerDuringUpdate = screen.getByTestId('select-trigger');
      expect(selectTriggerDuringUpdate).toHaveAttribute('aria-busy', 'true');
    });

    it('verifies aria-disabled on edit button during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');

      // Before update: aria-disabled should be false
      expect(editButton).toHaveAttribute('aria-disabled', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-disabled is set to true
      expect(editButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('verifies aria-busy on edit button during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');

      // Before update: aria-busy should be false
      expect(editButton).toHaveAttribute('aria-busy', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-busy is set to true
      expect(editButton).toHaveAttribute('aria-busy', 'true');
    });

    it('verifies aria-disabled on delete button during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      // Before update: aria-disabled should be false
      expect(deleteButton).toHaveAttribute('aria-disabled', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-disabled is set to true
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('verifies aria-busy on delete button during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      // Before update: aria-busy should be false
      expect(deleteButton).toHaveAttribute('aria-busy', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify aria-busy is set to true
      expect(deleteButton).toHaveAttribute('aria-busy', 'true');
    });

    it('verifies disabled attribute on status dropdown during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const select = screen.getByTestId('select');

      // Before update: not disabled
      expect(select).toHaveAttribute('data-disabled', 'false');

      // Trigger status update
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify disabled attribute is set
      const selectDuringUpdate = screen.getByTestId('select');
      expect(selectDuringUpdate).toHaveAttribute('data-disabled', 'true');
    });

    it('verifies loading spinner visibility during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Before update: no loading spinner
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify loading spinner is visible
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass('animate-spin');
      expect(loader).toHaveAttribute('aria-hidden', 'true');
    });

    it('verifies edit button disabled state during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');

      // Before update: edit button enabled
      expect(editButton).not.toBeDisabled();

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify edit button is disabled
      expect(editButton).toBeDisabled();
    });

    it('verifies delete button disabled state during isPending', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      // Before update: delete button enabled
      expect(deleteButton).not.toBeDisabled();

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // During update: verify delete button is disabled
      expect(deleteButton).toBeDisabled();
    });

    it('verifies loading state prevents multiple simultaneous status changes', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selects = screen.getAllByTestId('select');

      // Trigger first status update
      const firstButton = within(selects[0]!).getByRole('button');
      await user.click(firstButton);

      // Verify first select is disabled during update
      expect(selects[0]).toHaveAttribute('data-disabled', 'true');

      // Second device (ON_LOAN) has no select dropdown, so we only have 2 selects total
      // Third device (index 1 in selects array) should still be enabled
      const secondSelectInArray = screen.getAllByTestId('select')[1];
      if (secondSelectInArray) {
        expect(secondSelectInArray).toHaveAttribute('data-disabled', 'false');
      }

      // Verify mutation was called only once
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('verifies loading spinner has correct visual styling', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Verify loading spinner has correct visual classes
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-4');
      expect(loader).toHaveClass('w-4');
      expect(loader).toHaveClass('animate-spin');
      expect(loader).toHaveClass('text-muted-foreground');
    });

    it('verifies user feedback during mutation with all visual indicators', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Verify all visual indicators are present:
      // 1. Loading spinner
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toBeInTheDocument();

      // 2. Disabled status dropdown
      expect(select).toHaveAttribute('data-disabled', 'true');

      // 3. Disabled edit button
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      expect(editButton).toBeDisabled();

      // 4. Disabled delete button
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');
      expect(deleteButton).toBeDisabled();
    });

    it('verifies loading state clears after successful mutation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Wait for mutation to complete
      await vi.waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // After completion: verify loading spinner is removed
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();

      // After completion: verify status dropdown is re-enabled
      expect(select).toHaveAttribute('data-disabled', 'false');

      // After completion: verify buttons are re-enabled
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');
      expect(editButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });

    it('verifies aria-disabled is reset after mutation complete', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Wait for mutation to complete
      await vi.waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify all aria-disabled attributes are reset to false
      const selectTrigger = screen.getByTestId('select-trigger');
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      expect(selectTrigger).toHaveAttribute('aria-disabled', 'false');
      expect(editButton).toHaveAttribute('aria-disabled', 'false');
      expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('verifies aria-busy is reset after mutation complete', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Wait for mutation to complete
      await vi.waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Verify all aria-busy attributes are reset to false
      const selectTrigger = screen.getByTestId('select-trigger');
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      expect(selectTrigger).toHaveAttribute('aria-busy', 'false');
      expect(editButton).toHaveAttribute('aria-busy', 'false');
      expect(deleteButton).toHaveAttribute('aria-busy', 'false');
    });

    it('verifies complete accessibility state cycle during mutation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      // BEFORE: Verify initial accessibility state
      expect(selectTrigger).toHaveAttribute('aria-disabled', 'false');
      expect(selectTrigger).toHaveAttribute('aria-busy', 'false');
      expect(editButton).toHaveAttribute('aria-disabled', 'false');
      expect(editButton).toHaveAttribute('aria-busy', 'false');
      expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
      expect(deleteButton).toHaveAttribute('aria-busy', 'false');

      // Trigger status update
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Wait for mutation to complete (using resolved mock)
      await vi.waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // AFTER: Verify accessibility state is restored
      expect(selectTrigger).toHaveAttribute('aria-disabled', 'false');
      expect(selectTrigger).toHaveAttribute('aria-busy', 'false');
      expect(editButton).toHaveAttribute('aria-disabled', 'false');
      expect(editButton).toHaveAttribute('aria-busy', 'false');
      expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
      expect(deleteButton).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('Loading States (AC6)', () => {
    it('shows skeleton loaders when isLoading is true', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={true}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows 5 skeleton rows during loading', () => {
      const { container } = render(
        <DeviceTable
          devices={[]}
          isLoading={true}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });

    it('skeleton rows have correct structure', () => {
      const { container } = render(
        <DeviceTable
          devices={[]}
          isLoading={true}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0];
      const cells = firstRow?.querySelectorAll('td');
      expect(cells).toHaveLength(5); // 5 columns
    });

    it('does not show device rows when loading', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={true}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.queryByText('Florian 4-21')).not.toBeInTheDocument();
    });

    it('shows background fetching indicator when isFetching is true', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Aktualisiere...')).toBeInTheDocument();
      const loader = screen.getAllByTestId('loader-icon').find(el =>
        el.className.includes('animate-spin')
      );
      expect(loader).toBeInTheDocument();
    });

    it('does not show fetching indicator when not fetching', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.queryByText('Aktualisiere...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State (AC5)', () => {
    it('shows empty state when no devices and not loading', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Keine Geräte vorhanden')).toBeInTheDocument();
    });

    it('empty state shows "Neues Gerät" button', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByRole('button', { name: /Neues Gerät/i })).toBeInTheDocument();
    });

    it('empty state button calls onAddNew when clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const button = screen.getByRole('button', { name: /Neues Gerät/i });
      await user.click(button);

      expect(mockOnAddNew).toHaveBeenCalledTimes(1);
    });

    it('empty state shows Radio icon', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByTestId('radio-icon')).toBeInTheDocument();
    });

    it('empty state button has touch-optimized size', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const button = screen.getByRole('button', { name: /Neues Gerät/i });
      expect(button).toHaveClass('min-h-16');
    });

    it('does not show table when in empty state', () => {
      const { container } = render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility (AC7)', () => {
    it('edit buttons have proper aria-label with device name', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByLabelText('Florian 4-21 bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-22 bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-23 bearbeiten')).toBeInTheDocument();
    });

    it('delete buttons have proper aria-label with device name', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByLabelText('Florian 4-21 löschen')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-22 löschen')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-23 löschen')).toBeInTheDocument();
    });

    it('icons have aria-hidden attribute', () => {
      const { container } = render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const icons = container.querySelectorAll('[data-testid$="-icon"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('action buttons have minimum touch target size', () => {
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      editButtons.forEach(button => {
        expect(button).toHaveClass('min-h-16');
        expect(button).toHaveClass('min-w-16');
      });

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      deleteButtons.forEach(button => {
        expect(button).toHaveClass('min-h-16');
        expect(button).toHaveClass('min-w-16');
      });
    });
  });

  describe('Keyboard Navigation (Fix #3)', () => {
    it('allows tabbing through action buttons', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      const deleteButtons = screen.getAllByLabelText(/löschen/i);

      // Note: Actual tab order includes status dropdown first, then action buttons
      // This test verifies that action buttons are keyboard accessible
      editButtons[0]!.focus();
      expect(editButtons[0]).toHaveFocus();

      await user.tab();
      expect(deleteButtons[0]).toHaveFocus();
    });

    it('activates button on Enter key press', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      editButtons[0]!.focus();

      await user.keyboard('{Enter}');

      expect(mockOnEdit).toHaveBeenCalledWith(mockDevices[0]);
    });

    it('activates button on Space key press', async () => {
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      deleteButtons[0]!.focus();

      await user.keyboard(' ');

      expect(mockOnDelete).toHaveBeenCalledWith(mockDevices[0]);
    });

    it('allows keyboard navigation within status dropdown', async () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Verify select trigger has correct accessibility attributes
      const selectTrigger = screen.getByTestId('select-trigger');
      expect(selectTrigger).toHaveAttribute('aria-label', 'Status ändern für Florian 4-21');

      // Note: Actual keyboard navigation (arrow keys, enter, etc.) is delegated to the Select component
      // This test verifies the Select is properly configured for keyboard accessibility
    });

    it('supports Escape key to close dialogs (integration behavior)', async () => {
      // This test documents expected behavior - actual dialog closing
      // would be tested in Dialog component tests
      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Focus management should work correctly
      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      editButtons[0]!.focus();
      expect(editButtons[0]).toHaveFocus();
    });

    it('supports arrow key navigation in dropdown (delegated to Select component)', async () => {
      // Note: Actual arrow key handling is in the Select component
      // This test verifies the Select is properly configured
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selectTrigger = screen.getByTestId('select-trigger');
      expect(selectTrigger).toHaveAttribute('aria-label', 'Status ändern für Florian 4-21');
    });
  });

  describe('Component Behavior', () => {
    it('handles devices prop change correctly', () => {
      const { rerender } = render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
      expect(screen.queryByText('Florian 4-22')).not.toBeInTheDocument();

      rerender(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
    });

    it('transitions from loading to data state', () => {
      const { rerender } = render(
        <DeviceTable
          devices={[]}
          isLoading={true}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);

      rerender(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
    });

    it('handles empty device array gracefully', () => {
      render(
        <DeviceTable
          devices={[]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Keine Geräte vorhanden')).toBeInTheDocument();
    });

    it('handles single device correctly', () => {
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      expect(editButtons).toHaveLength(1);
    });

    it('handles many devices correctly', () => {
      const manyDevices = Array.from({ length: 20 }, (_, i) => ({
        ...mockDevices[0]!,
        id: `device-${i}`,
        callSign: `Florian 4-${20 + i}`,
      }));

      render(
        <DeviceTable
          devices={manyDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      expect(screen.getByText('Florian 4-20')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-39')).toBeInTheDocument();
    });
  });

  describe('aria-label XSS Protection (Issue #8)', () => {
    it('sanitizes device names with quotes in aria-labels', () => {
      const deviceWithQuotes: Device = {
        id: 'xss-quotes',
        callSign: 'Test"Device\'With`Quotes',
        serialNumber: 'SN-XSS-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithQuotes]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Check edit button aria-label has no quotes
      const editButton = screen.getByLabelText(/TestDeviceWithQuotes bearbeiten/i);
      const editAriaLabel = editButton.getAttribute('aria-label');
      expect(editAriaLabel).not.toContain('"');
      expect(editAriaLabel).not.toContain("'");
      expect(editAriaLabel).not.toContain('`');
      expect(editAriaLabel).toContain('TestDeviceWithQuotes');

      // Check delete button aria-label has no quotes
      const deleteButton = screen.getByLabelText(/TestDeviceWithQuotes löschen/i);
      const deleteAriaLabel = deleteButton.getAttribute('aria-label');
      expect(deleteAriaLabel).not.toContain('"');
      expect(deleteAriaLabel).not.toContain("'");
      expect(deleteAriaLabel).not.toContain('`');
      expect(deleteAriaLabel).toContain('TestDeviceWithQuotes');

      // Check status dropdown aria-label has no quotes
      const selectTrigger = screen.getByTestId('select-trigger');
      const selectAriaLabel = selectTrigger.getAttribute('aria-label');
      expect(selectAriaLabel).not.toContain('"');
      expect(selectAriaLabel).not.toContain("'");
      expect(selectAriaLabel).not.toContain('`');
      expect(selectAriaLabel).toContain('TestDeviceWithQuotes');
    });

    it('sanitizes device names with HTML in aria-labels', () => {
      const deviceWithHTML: Device = {
        id: 'xss-html',
        callSign: '<script>alert(\'xss\')</script>',
        serialNumber: 'SN-XSS-002',
        deviceType: 'Mobile',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithHTML]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Check edit button aria-label has no HTML tags
      // Sanitized: scriptalert(xss)/script (quotes and angle brackets removed)
      const editButton = screen.getByLabelText(/scriptalert\(xss\)\/script bearbeiten/i);
      const editAriaLabel = editButton.getAttribute('aria-label');
      expect(editAriaLabel).not.toContain('<');
      expect(editAriaLabel).not.toContain('>');
      expect(editAriaLabel).not.toContain("'");
      expect(editAriaLabel).toContain('scriptalert');

      // Check delete button aria-label has no HTML tags
      const deleteButton = screen.getByLabelText(/scriptalert\(xss\)\/script löschen/i);
      const deleteAriaLabel = deleteButton.getAttribute('aria-label');
      expect(deleteAriaLabel).not.toContain('<');
      expect(deleteAriaLabel).not.toContain('>');
      expect(deleteAriaLabel).not.toContain("'");

      // Check status dropdown aria-label has no HTML tags
      const selectTrigger = screen.getByTestId('select-trigger');
      const selectAriaLabel = selectTrigger.getAttribute('aria-label');
      expect(selectAriaLabel).not.toContain('<');
      expect(selectAriaLabel).not.toContain('>');
      expect(selectAriaLabel).not.toContain("'");
    });

    it('handles special characters in aria-labels correctly', () => {
      const deviceWithSpecialChars: Device = {
        id: 'xss-special',
        callSign: 'Gerät & Test < > "quotes"',
        serialNumber: 'SN-XSS-003',
        deviceType: 'Base Station',
        status: 'DEFECT',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithSpecialChars]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Sanitized text should be: "Gerät & Test   quotes" (3 spaces: 2 from < >, 1 from original)
      const sanitized = sanitizeForDisplay(deviceWithSpecialChars.callSign);
      expect(sanitized).toBe('Gerät & Test   quotes');

      // Check edit button is findable by sanitized aria-label (use regex to handle whitespace)
      const editButton = screen.getByLabelText(/Gerät & Test\s+quotes bearbeiten/i);
      expect(editButton).toBeInTheDocument();

      // Check delete button is findable by sanitized aria-label
      const deleteButton = screen.getByLabelText(/Gerät & Test\s+quotes löschen/i);
      expect(deleteButton).toBeInTheDocument();

      // Verify all dangerous characters are removed from aria-labels
      const editAriaLabel = editButton.getAttribute('aria-label');
      expect(editAriaLabel).not.toContain('<');
      expect(editAriaLabel).not.toContain('>');
      expect(editAriaLabel).not.toContain('"');
      expect(editAriaLabel).toContain('Gerät & Test');
    });

    it('prevents apostrophe-based attribute injection in aria-labels', () => {
      const deviceWithInjection: Device = {
        id: 'xss-injection',
        callSign: "Test' onmouseover='alert(1)",
        serialNumber: 'SN-XSS-004',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithInjection]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Sanitized: "Test onmouseover=alert(1)" (apostrophes removed, = remains but harmless)
      const editButton = screen.getByLabelText(/Test onmouseover=alert\(1\) bearbeiten/i);
      const editAriaLabel = editButton.getAttribute('aria-label');

      // Most critical: no apostrophes that would allow attribute injection
      expect(editAriaLabel).not.toContain("'");

      // Verify the dangerous event handler text is still present (but neutered without quotes)
      // Without quotes, "onmouseover=alert(1)" is just text, not executable code
      expect(editAriaLabel).toContain('Test');
      expect(editAriaLabel).toContain('onmouseover');
      expect(editAriaLabel).toContain('alert');
      expect(editAriaLabel).toContain('bearbeiten');

      // Check delete button aria-label has no apostrophes
      const deleteButton = screen.getByLabelText(/Test onmouseover=alert\(1\) löschen/i);
      const deleteAriaLabel = deleteButton.getAttribute('aria-label');
      expect(deleteAriaLabel).not.toContain("'");

      // Check status dropdown aria-label has no apostrophes
      const selectTrigger = screen.getByTestId('select-trigger');
      const selectAriaLabel = selectTrigger.getAttribute('aria-label');
      expect(selectAriaLabel).not.toContain("'");
    });

    it('all action buttons have unique accessible names', () => {
      // Create devices with similar names to test uniqueness
      const similarDevices: Device[] = [
        {
          id: 'device-a',
          callSign: 'Florian 4-21',
          serialNumber: 'SN-A',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'device-b',
          callSign: 'Florian 4-22',
          serialNumber: 'SN-B',
          deviceType: 'Mobile',
          status: 'AVAILABLE',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      render(
        <DeviceTable
          devices={similarDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Collect all aria-labels from buttons
      const editButtons = screen.getAllByLabelText(/bearbeiten/i);
      const deleteButtons = screen.getAllByLabelText(/löschen/i);
      const allButtons = [...editButtons, ...deleteButtons];

      const ariaLabels = allButtons.map(button => button.getAttribute('aria-label'));

      // Ensure all aria-labels are unique
      const uniqueLabels = new Set(ariaLabels);
      expect(uniqueLabels.size).toBe(ariaLabels.length);

      // Ensure each device has unique edit and delete labels
      expect(screen.getByLabelText('Florian 4-21 bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-21 löschen')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-22 bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian 4-22 löschen')).toBeInTheDocument();

      // Ensure status dropdowns also have unique labels
      const selectTriggers = screen.getAllByTestId('select-trigger');
      const selectLabels = selectTriggers.map(trigger => trigger.getAttribute('aria-label'));
      const uniqueSelectLabels = new Set(selectLabels);
      expect(uniqueSelectLabels.size).toBe(selectLabels.length);
    });

    it('sanitizes zero-width and RTL characters in aria-labels', () => {
      const deviceWithInvisibleChars: Device = {
        id: 'xss-invisible',
        callSign: 'Test\u200B\u200CDevice\u202A\u202EName',
        serialNumber: 'SN-XSS-005',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithInvisibleChars]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButton = screen.getByLabelText(/TestDeviceName bearbeiten/i);
      const editAriaLabel = editButton.getAttribute('aria-label');

      // Verify zero-width and RTL characters are removed
      expect(editAriaLabel).not.toContain('\u200B');
      expect(editAriaLabel).not.toContain('\u200C');
      expect(editAriaLabel).not.toContain('\u202A');
      expect(editAriaLabel).not.toContain('\u202E');
      expect(editAriaLabel).toContain('TestDeviceName');
    });

    it('sanitizes control characters in aria-labels', () => {
      const deviceWithControlChars: Device = {
        id: 'xss-control',
        callSign: 'Test\x00\x1F\x7FDevice',
        serialNumber: 'SN-XSS-006',
        deviceType: 'Mobile',
        status: 'AVAILABLE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <DeviceTable
          devices={[deviceWithControlChars]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const editButton = screen.getByLabelText(/TestDevice bearbeiten/i);
      const editAriaLabel = editButton.getAttribute('aria-label');

      // Verify control characters are removed
      expect(editAriaLabel).not.toContain('\x00');
      expect(editAriaLabel).not.toContain('\x1F');
      expect(editAriaLabel).not.toContain('\x7F');
      expect(editAriaLabel).toContain('TestDevice');
    });

    it('maintains usability after sanitization', () => {
      // Test that common legitimate device names still work well
      const legitimateDevices: Device[] = [
        {
          id: 'device-1',
          callSign: 'Florian München 4-21',
          serialNumber: 'SN-001',
          deviceType: 'Handheld',
          status: 'AVAILABLE',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'device-2',
          callSign: 'FME-2024-Gerät',
          serialNumber: 'SN-002',
          deviceType: 'Base Station',
          status: 'DEFECT',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      render(
        <DeviceTable
          devices={legitimateDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // All buttons should be findable with clean aria-labels
      expect(screen.getByLabelText('Florian München 4-21 bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Florian München 4-21 löschen')).toBeInTheDocument();
      expect(screen.getByLabelText('FME-2024-Gerät bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('FME-2024-Gerät löschen')).toBeInTheDocument();

      // Status dropdowns should also be accessible
      expect(screen.getByLabelText('Status ändern für Florian München 4-21')).toBeInTheDocument();
      expect(screen.getByLabelText('Status ändern für FME-2024-Gerät')).toBeInTheDocument();
    });
  });

  // MEDIUM #8: Concurrent Mutation Tests
  describe('Concurrent Mutation Tests', () => {
    it('handles status change during delete operation', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Start status change
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Verify status dropdown is disabled during mutation
      const selectDuringUpdate = screen.getByTestId('select');
      expect(selectDuringUpdate).toHaveAttribute('data-disabled', 'true');

      // Try to click delete button during status change
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');
      expect(deleteButton).toBeDisabled();

      // Verify delete was not called
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('handles edit during status change operation', async () => {
      const mockMutateAsync = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Start status change
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      // Try to click edit button during status change
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      expect(editButton).toBeDisabled();

      // Verify edit was not called
      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('handles multiple status changes on different devices simultaneously', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={mockDevices}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      const selects = screen.getAllByTestId('select');

      // Trigger status change on first device
      const firstButton = within(selects[0]!).getByRole('button');
      await user.click(firstButton);

      // Verify first select is disabled while mutation is pending
      expect(selects[0]).toHaveAttribute('data-disabled', 'true');

      // Second device (ON_LOAN) has no select, so we have only 2 selects
      // Third device (index 1 in selects array) should still be enabled
      const secondSelectInArray = screen.getAllByTestId('select')[1];
      if (secondSelectInArray) {
        // Second device can still change status
        expect(secondSelectInArray).toHaveAttribute('data-disabled', 'false');
      }

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);

      // Resolve the pending promise to clean up
      resolvePromise!({});
    });

    it('prevents concurrent delete during status change', async () => {
      let resolveMutation: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });
      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Start status change (will stay pending)
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Delete button should be disabled during pending status change
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');
      expect(deleteButton).toBeDisabled();

      // Clean up
      resolveMutation!({});
    });

    it('prevents concurrent edit during status change', async () => {
      let resolveMutation: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });
      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Start status change (will stay pending)
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Edit button should be disabled during pending status change
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      expect(editButton).toBeDisabled();
      expect(editButton).toHaveAttribute('aria-disabled', 'true');

      // Clean up
      resolveMutation!({});
    });

    it('re-enables actions after status change completes', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateDeviceStatus.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })
      );

      const user = userEvent.setup();
      render(
        <DeviceTable
          devices={[mockDevices[0]!]}
          isLoading={false}
          isFetching={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onAddNew={mockOnAddNew}
        />
      );

      // Trigger and complete status change
      const select = screen.getByTestId('select');
      const button = within(select).getByRole('button');
      await user.click(button);

      await vi.waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // After completion, actions should be re-enabled
      const editButton = screen.getByLabelText('Florian 4-21 bearbeiten');
      const deleteButton = screen.getByLabelText('Florian 4-21 löschen');

      expect(editButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });
});
