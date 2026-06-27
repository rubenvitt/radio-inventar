// apps/frontend/src/routes/admin/devices.spec.tsx
// Read-only devices page tests.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    value: {
      data: [] as unknown[],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      isError: false,
      error: null as Error | null,
    },
  },
}));

vi.mock('@/api/admin-devices', () => ({
  useAdminDevices: () => mockState.value,
}));

vi.mock('@/components/features/admin/PrintTemplateButton', () => ({
  PrintTemplateButton: () => createElement('button', {}, 'Druckvorlage'),
}));

vi.mock('@/components/features/admin/DeviceTable', () => ({
  DeviceTable: ({ devices }: { devices: unknown[] }) =>
    createElement('div', { 'data-testid': 'device-table' }, `${devices.length} devices`),
}));

import { Route } from './devices';

const Page = Route.options.component as () => JSX.Element;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return render(createElement(Page), { wrapper });
}

describe('AdminDevicesPage (read-only)', () => {
  it('renders the device table and the radio-admin info banner', () => {
    mockState.value = { ...mockState.value, data: [{ id: 'a' }], isError: false, error: null };
    renderPage();
    expect(screen.getByTestId('device-table')).toHaveTextContent('1 devices');
    expect(screen.getByText(/zentral in/i)).toBeInTheDocument();
    expect(screen.getByText(/radio-admin/i)).toBeInTheDocument();
  });

  it('does not offer a "Neues Gerät" action', () => {
    mockState.value = { ...mockState.value, data: [], isError: false, error: null };
    renderPage();
    expect(screen.queryByText(/Neues Gerät/i)).toBeNull();
  });
});
