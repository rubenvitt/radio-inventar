import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectableDeviceCard } from './SelectableDeviceCard'
import type { DeviceWithLoanInfo } from '@/api/devices'

const mockDevice: DeviceWithLoanInfo = {
  id: 'test-001',
  callSign: 'Florian 4-23',
  serialNumber: 'SN-001',
  deviceType: 'Handheld',
  status: 'AVAILABLE',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SelectableDeviceCard', () => {
  it('zeigt Gerät-Info (callSign, Status)', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Florian 4-23')).toBeInTheDocument()
    expect(screen.getByText('Handheld')).toBeInTheDocument()
  })

  it('hat min-height 88px Klasse', () => {
    const { container } = render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('min-h-[88px]')
  })

  it('zeigt ausgewählt-Style wenn isSelected', () => {
    const { container } = render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={true}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('ring-2', 'ring-primary', 'border-primary')
  })

  it('zeigt disabled-Style wenn !isSelectable', () => {
    const { container } = render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={vi.fn()}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('hat aria-selected="true" wenn ausgewählt', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={true}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toHaveAttribute('aria-selected', 'true')
  })

  it('hat aria-selected="false" wenn nicht ausgewählt', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toHaveAttribute('aria-selected', 'false')
  })

  it('hat aria-disabled="true" wenn !isSelectable', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toHaveAttribute('aria-disabled', 'true')
  })

  it('hat tabIndex={0} wenn wählbar', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('hat tabIndex={-1} wenn disabled', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toHaveAttribute('tabIndex', '-1')
  })

  it('reagiert auf Enter-Taste wenn wählbar', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(mockDevice.id)
  })

  it('reagiert auf Space-Taste wenn wählbar', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(mockDevice.id)
  })

  it('ignoriert Enter-Taste wenn disabled', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ruft onSelect bei Klick wenn wählbar', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    fireEvent.click(card)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(mockDevice.id)
  })

  it('ignoriert Klick wenn disabled', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    fireEvent.click(card)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('zeigt borrower info wenn ON_LOAN', () => {
    const onLoanDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'ON_LOAN',
      borrowerName: 'Max Mustermann',
      borrowedAt: new Date('2025-12-17T14:30:00'),
    }
    render(
      <SelectableDeviceCard
        device={onLoanDevice}
        deviceId={onLoanDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.getByText(/seit.*Uhr/)).toBeInTheDocument()
  })

  it('sanitizes callSign to prevent XSS', () => {
    const xssDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      callSign: '<script>alert("xss")</script>',
    }
    render(
      <SelectableDeviceCard
        device={xssDevice}
        deviceId={xssDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    // HTML tags should be stripped
    expect(screen.queryByText(/<script>/)).not.toBeInTheDocument()
    expect(screen.getByText(/scriptalert/i)).toBeInTheDocument()
  })

  it('sanitizes borrowerName to prevent XSS', () => {
    const xssDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'ON_LOAN',
      borrowerName: '<img src=x onerror="alert(1)">',
    }
    render(
      <SelectableDeviceCard
        device={xssDevice}
        deviceId={xssDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    // HTML tags should be stripped
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Sanitized text should be present
    expect(screen.getByText(/img src=x onerror=alert/i)).toBeInTheDocument()
  })

  it('hat role="option"', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    expect(card).toBeInTheDocument()
  })

  it('has aria-label with callSign and status', () => {
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    const ariaLabel = card.getAttribute('aria-label')
    expect(ariaLabel).toContain('Florian 4-23')
    expect(ariaLabel).toContain('Verfügbar')
  })

  it('sanitizes aria-label from XSS in callSign', () => {
    const xssDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      callSign: 'Test" onmouseover="alert(1)',
    }
    render(
      <SelectableDeviceCard
        device={xssDevice}
        deviceId={xssDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    const ariaLabel = card.getAttribute('aria-label')
    // Quotes should be stripped from aria-label
    expect(ariaLabel).not.toContain('"')
    expect(ariaLabel).toContain('Test')
  })

  it('shows correct status label for DEFECT status', () => {
    const defectDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'DEFECT',
    }
    render(
      <SelectableDeviceCard
        device={defectDevice}
        deviceId={defectDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    const ariaLabel = card.getAttribute('aria-label')
    expect(ariaLabel).toContain('Defekt')
  })

  it('shows correct status label for MAINTENANCE status', () => {
    const maintenanceDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'MAINTENANCE',
    }
    render(
      <SelectableDeviceCard
        device={maintenanceDevice}
        deviceId={maintenanceDevice.id}
        isSelected={false}
        isSelectable={false}
        onSelect={vi.fn()}
      />
    )
    const card = screen.getByRole('option')
    const ariaLabel = card.getAttribute('aria-label')
    expect(ariaLabel).toContain('Wartung')
  })

  it('prevents default on Space key to avoid page scroll', () => {
    const onSelect = vi.fn()
    render(
      <SelectableDeviceCard
        device={mockDevice}
        deviceId={mockDevice.id}
        isSelected={false}
        isSelectable={true}
        onSelect={onSelect}
      />
    )
    const card = screen.getByRole('option')
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    card.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  describe('Performance', () => {
    it('ist mit React.memo optimiert', () => {
      // Verify component is memoized by checking displayName or type
      expect(SelectableDeviceCard).toBeDefined()
      // Memo components have a 'type' property
      expect((SelectableDeviceCard as any).$$typeof?.toString()).toContain('Symbol')
    })
  })
})
