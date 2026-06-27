// apps/frontend/src/components/features/admin/DeviceTable.spec.tsx
// Read-only device table tests.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeviceTable } from './DeviceTable';
import type { AdminDevice } from '@/api/admin-devices';

vi.mock('@/components/features/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

const devices: AdminDevice[] = [
  { id: 'a', callSign: 'Florian 4-21', serialNumber: 'SN-001', deviceType: 'Handheld', status: 'AVAILABLE' },
  { id: 'b', callSign: 'Florian 4-22', serialNumber: null, deviceType: null, status: 'ON_LOAN' },
];

describe('DeviceTable (read-only)', () => {
  it('renders a row per device with a status badge', () => {
    render(<DeviceTable devices={devices} isLoading={false} isFetching={false} />);
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
    expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
    expect(screen.getAllByTestId('status-badge')).toHaveLength(2);
  });

  it('shows the empty state when there are no devices', () => {
    render(<DeviceTable devices={[]} isLoading={false} isFetching={false} />);
    expect(screen.getByText(/Keine ausleihbaren Geräte/i)).toBeInTheDocument();
  });

  it('renders no edit / delete / status-change controls', () => {
    render(<DeviceTable devices={devices} isLoading={false} isFetching={false} />);
    expect(screen.queryByRole('button', { name: /bearbeiten|löschen|status ändern/i })).toBeNull();
  });
});
