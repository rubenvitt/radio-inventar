import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

// Mock TanStack Router so importing return.tsx doesn't require a router registration
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      ...options,
      path,
      fullPath: path,
    }),
  }
})

vi.mock('@/api/loans', () => ({
  useActiveLoans: vi.fn(),
  useReturnDevice: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { useActiveLoans } from '@/api/loans'
import { ReturnPage } from './return'

const mockUseActiveLoans = vi.mocked(useActiveLoans)

describe('ReturnPage', () => {
  it('filtert Ausleihen per Suche nach Ausleiher-Name', async () => {
    mockUseActiveLoans.mockReturnValue({
      data: [
        {
          id: 'l1',
          deviceId: 'd1',
          borrowerName: 'Meyer',
          borrowedAt: '2026-07-01T10:00:00Z',
          device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' },
        },
        {
          id: 'l2',
          deviceId: 'd2',
          borrowerName: 'Schulze',
          borrowedAt: '2026-07-01T10:00:00Z',
          device: { id: 'd2', callSign: 'Rotkreuz 1', status: 'ON_LOAN' },
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActiveLoans>)

    render(<ReturnPage />)
    await userEvent.type(screen.getByRole('searchbox'), 'schulze')
    expect(screen.getByText('Rotkreuz 1')).toBeInTheDocument()
    expect(screen.queryByText('Florian 4-21')).not.toBeInTheDocument()
  })

  it('zeigt kein Suchfeld, wenn keine Ausleihen vorhanden sind', () => {
    mockUseActiveLoans.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActiveLoans>)

    render(<ReturnPage />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
