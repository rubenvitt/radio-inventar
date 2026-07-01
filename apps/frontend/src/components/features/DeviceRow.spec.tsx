import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceRow } from './DeviceRow'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: 'dev-1',
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('DeviceRow', () => {
  it('zeigt Rufname und Gerätetyp', () => {
    render(<DeviceRow device={dev()} onSelect={vi.fn()} selectable />)
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
    expect(screen.getByText('Handheld')).toBeInTheDocument()
  })

  it('zeigt Ausleiher statt Gerätetyp, wenn ausgeliehen', () => {
    render(
      <DeviceRow
        device={dev({ status: 'ON_LOAN', borrowerName: 'Meyer', deviceType: 'Handheld' })}
        onSelect={vi.fn()}
        selectable={false}
      />,
    )
    expect(screen.getByText(/Meyer/)).toBeInTheDocument()
  })

  it('ruft onSelect bei Klick, wenn selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev()} onSelect={onSelect} selectable />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('dev-1')
  })

  it('ruft onSelect nicht, wenn nicht selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev({ status: 'ON_LOAN' })} onSelect={onSelect} selectable={false} />)
    await userEvent.click(screen.getByText('Florian 4-21'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('Auswahl-Modus: role=option + aria-selected', () => {
    render(<DeviceRow device={dev()} onSelect={vi.fn()} selectable selected />)
    const row = screen.getByRole('option')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  it('zeigt Ausleiher mit Uhrzeit, wenn borrowedAt gesetzt ist', () => {
    render(
      <DeviceRow
        device={dev({ status: 'ON_LOAN', borrowerName: 'Meyer', borrowedAt: new Date('2026-07-01T14:30:00') })}
        onSelect={vi.fn()}
        selectable={false}
      />,
    )
    expect(screen.getByText('Meyer · 14:30 Uhr')).toBeInTheDocument()
  })

  it('ruft onSelect bei Enter, wenn selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev()} onSelect={onSelect} selectable />)
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('dev-1')
  })

  it('ruft onSelect nicht bei Enter, wenn nicht selectable', async () => {
    const onSelect = vi.fn()
    render(<DeviceRow device={dev({ status: 'ON_LOAN' })} onSelect={onSelect} selectable={false} />)
    await userEvent.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
