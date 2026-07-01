import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceSelector } from './DeviceSelector'
import type { UseQueryResult } from '@tanstack/react-query'
import type { DeviceWithLoanInfo } from '@/api/devices'

// Mock the hook
vi.mock('@/api/devices', () => ({
  useDevices: vi.fn(),
}))

import { useDevices } from '@/api/devices'
const mockUseDevices = vi.mocked(useDevices)

// Helper to create properly typed mock return values
type UseDevicesResult = UseQueryResult<DeviceWithLoanInfo[], Error>

function createMockReturn(overrides: Partial<UseDevicesResult>): UseDevicesResult {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: false,
    refetch: vi.fn(),
    status: 'pending',
    ...overrides,
  } as UseDevicesResult
}

const mockDevices: DeviceWithLoanInfo[] = [
  {
    id: 'dev1',
    callSign: 'Florian 4-21',
    status: 'AVAILABLE',
    serialNumber: 'SN1',
    deviceType: 'Handheld',
    location: 'FüKW',
  },
  {
    id: 'dev2',
    callSign: 'Florian 4-22',
    status: 'ON_LOAN',
    serialNumber: 'SN2',
    deviceType: 'Handheld',
    location: 'FüKW',
    borrowerName: 'Max Mustermann',
  },
  {
    id: 'dev3',
    callSign: 'Florian 4-23',
    status: 'DEFECT',
    serialNumber: 'SN3',
    deviceType: 'Handheld',
    location: 'FüKW',
  },
  {
    id: 'dev4',
    callSign: 'Florian 4-24',
    status: 'MAINTENANCE',
    serialNumber: 'SN4',
    deviceType: 'Handheld',
    location: 'FüKW',
  },
]

describe('DeviceSelector', () => {
  const defaultProps = {
    selectedDeviceIds: [],
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zeigt Loading-State während Fetch', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      isLoading: true,
      isPending: true,
      status: 'pending',
    }))

    render(<DeviceSelector {...defaultProps} />)

    // Check for LoadingState component
    const loadingState = screen.getByRole('status', { name: 'Geräte werden geladen' })
    expect(loadingState).toBeInTheDocument()
    expect(loadingState).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-[200px]')

    // Check for spinner
    const spinner = loadingState.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()

    expect(screen.getByText('Geräte werden geladen...')).toBeInTheDocument()
  })

  it('zeigt Error-State bei Fehler', () => {
    const mockRefetch = vi.fn()
    mockUseDevices.mockReturnValue(createMockReturn({
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
      status: 'error',
    }))

    render(<DeviceSelector {...defaultProps} />)

    expect(screen.getByText('Fehler beim Laden der Geräte')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
  })

  it('zeigt alle Geräte in der Liste', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    // Check all devices are rendered
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
    expect(screen.getByText('Florian 4-22')).toBeInTheDocument()
    expect(screen.getByText('Florian 4-23')).toBeInTheDocument()
    expect(screen.getByText('Florian 4-24')).toBeInTheDocument()
  })

  it('rendert AVAILABLE Geräte als wählbar', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const availableCard = screen.getByRole('option', { name: /Florian 4-21/i })
    expect(availableCard).toBeInTheDocument()
    expect(availableCard).toHaveAttribute('tabIndex', '0')
    expect(availableCard).toHaveAttribute('aria-disabled', 'false')
  })

  it('rendert ON_LOAN Geräte als disabled', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const onLoanCard = screen.getByRole('option', { name: /Florian 4-22/i })
    expect(onLoanCard).toBeInTheDocument()
    expect(onLoanCard).toHaveAttribute('tabIndex', '-1')
    expect(onLoanCard).toHaveAttribute('aria-disabled', 'true')
  })

  it('rendert DEFECT Geräte als disabled', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const defectCard = screen.getByRole('option', { name: /Florian 4-23/i })
    expect(defectCard).toBeInTheDocument()
    expect(defectCard).toHaveAttribute('tabIndex', '-1')
    expect(defectCard).toHaveAttribute('aria-disabled', 'true')
  })

  it('rendert MAINTENANCE Geräte als disabled', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const maintenanceCard = screen.getByRole('option', { name: /Florian 4-24/i })
    expect(maintenanceCard).toBeInTheDocument()
    expect(maintenanceCard).toHaveAttribute('tabIndex', '-1')
    expect(maintenanceCard).toHaveAttribute('aria-disabled', 'true')
  })

  it('ruft onSelect mit deviceId bei Klick', async () => {
    const mockOnSelect = vi.fn()
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(
      <DeviceSelector selectedDeviceIds={[]} onSelect={mockOnSelect} />
    )

    // Click on AVAILABLE device (Florian 4-21)
    const availableCard = screen.getByRole('option', { name: /Florian 4-21/i })
    expect(availableCard).toBeInTheDocument()

    await userEvent.click(availableCard)

    expect(mockOnSelect).toHaveBeenCalledTimes(1)
    expect(mockOnSelect).toHaveBeenCalledWith('dev1')
  })

  it('ignoriert Klick auf disabled Geräte', async () => {
    const mockOnSelect = vi.fn()
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(
      <DeviceSelector selectedDeviceIds={[]} onSelect={mockOnSelect} />
    )

    // Try clicking on ON_LOAN device (Florian 4-22)
    const onLoanCard = screen.getByRole('option', { name: /Florian 4-22/i })
    expect(onLoanCard).toBeInTheDocument()

    await userEvent.click(onLoanCard)

    // onSelect should not be called for disabled devices
    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('hebt ausgewähltes Gerät hervor', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(
      <DeviceSelector selectedDeviceIds={['dev1']} onSelect={vi.fn()} />
    )

    // Find the selected device card
    const selectedCard = screen.getByRole('option', { name: /Florian 4-21/i })
    expect(selectedCard).toBeInTheDocument()
    expect(selectedCard).toHaveAttribute('aria-selected', 'true')
  })

  it('zeigt "Keine Geräte vorhanden" wenn leer', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: [],
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    expect(screen.getByText('Keine Geräte vorhanden')).toBeInTheDocument()
  })

  it('hat role="listbox"', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()
  })

  it('hat aria-label für Accessibility', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const listbox = screen.getByRole('listbox', { name: 'Gerät auswählen' })
    expect(listbox).toBeInTheDocument()
  })

  it('hat aria-multiselectable="true" für Accessibility', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }))

    render(<DeviceSelector {...defaultProps} />)

    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
  })

  // Additional edge case tests
  describe('Edge Cases', () => {
    it('handles single device correctly', () => {
      const singleDevice: DeviceWithLoanInfo[] = [mockDevices[0]!]
      mockUseDevices.mockReturnValue(createMockReturn({
        data: singleDevice,
        isSuccess: true,
        status: 'success',
      }))

      render(<DeviceSelector {...defaultProps} />)

      expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
      expect(screen.queryByText('Florian 4-22')).not.toBeInTheDocument()
    })

    it('updates selection when selectedDeviceIds prop changes', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }))

      const { rerender } = render(
        <DeviceSelector selectedDeviceIds={[]} onSelect={vi.fn()} />
      )

      // Initially no selection
      let selectedCard = screen.getByRole('option', { name: /Florian 4-21/i })
      expect(selectedCard).toHaveAttribute('aria-selected', 'false')

      // Update selection
      rerender(<DeviceSelector selectedDeviceIds={['dev1']} onSelect={vi.fn()} />)

      selectedCard = screen.getByRole('option', { name: /Florian 4-21/i })
      expect(selectedCard).toHaveAttribute('aria-selected', 'true')
    })

    it('only renders AVAILABLE devices as selectable', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }))

      render(<DeviceSelector {...defaultProps} />)

      // Only dev1 (AVAILABLE) should be selectable
      const availableCard = screen.getByRole('option', { name: /Florian 4-21/i })
      expect(availableCard).toHaveAttribute('aria-disabled', 'false')
      expect(availableCard).toHaveAttribute('tabIndex', '0')

      // All others should be disabled
      const onLoanCard = screen.getByRole('option', { name: /Florian 4-22/i })
      const defectCard = screen.getByRole('option', { name: /Florian 4-23/i })
      const maintenanceCard = screen.getByRole('option', { name: /Florian 4-24/i })

      expect(onLoanCard).toHaveAttribute('aria-disabled', 'true')
      expect(onLoanCard).toHaveAttribute('tabIndex', '-1')
      expect(defectCard).toHaveAttribute('aria-disabled', 'true')
      expect(defectCard).toHaveAttribute('tabIndex', '-1')
      expect(maintenanceCard).toHaveAttribute('aria-disabled', 'true')
      expect(maintenanceCard).toHaveAttribute('tabIndex', '-1')
    })

    it('passes correct isSelected prop to each card', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }))

      render(
        <DeviceSelector selectedDeviceIds={['dev1']} onSelect={vi.fn()} />
      )

      // Only dev1 should be selected
      const dev1Card = screen.getByRole('option', { name: /Florian 4-21/i })
      const dev2Card = screen.getByRole('option', { name: /Florian 4-22/i })

      expect(dev1Card).toHaveAttribute('aria-selected', 'true')
      expect(dev2Card).toHaveAttribute('aria-selected', 'false')
    })
  })

  // FILTERING (Task 9: filter bar + grouped selectable rows)
  describe('Filtering', () => {
    it('filtert die auswählbaren Geräte per Suche', async () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: [
          { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' },
          { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', callSign: 'Rotkreuz 1', serialNumber: null, deviceType: 'Handheld', location: 'Lager', status: 'AVAILABLE' },
        ],
        isSuccess: true,
      }))
      render(<DeviceSelector selectedDeviceIds={[]} onSelect={vi.fn()} />)
      await userEvent.type(screen.getByRole('searchbox'), 'florian')
      expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
      expect(screen.queryByText('Rotkreuz 1')).not.toBeInTheDocument()
    })

    it('ruft onSelect beim Klick auf ein verfügbares Gerät', async () => {
      const onSelect = vi.fn()
      mockUseDevices.mockReturnValue(createMockReturn({
        data: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE' }],
        isSuccess: true,
      }))
      render(<DeviceSelector selectedDeviceIds={[]} onSelect={onSelect} />)
      await userEvent.click(screen.getByRole('option'))
      expect(onSelect).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa')
    })
  })
})
