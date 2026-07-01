import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceGroupedList } from './DeviceGroupedList'
import type { DeviceLocationGroup } from '@/lib/device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return { id: 'd1', callSign: 'Florian 4-21', serialNumber: null, deviceType: 'Handheld', location: 'FüKW', status: 'AVAILABLE', ...over }
}
const renderRow = (d: DeviceWithLoanInfo) => <div key={d.id}>{d.callSign}</div>

describe('DeviceGroupedList', () => {
  it('rendert flach (ohne Gruppen-Header) bei einer Gruppe', () => {
    const groups: DeviceLocationGroup[] = [{ key: 'FüKW', label: 'FüKW', devices: [dev()] }]
    render(<DeviceGroupedList groups={groups} query="" total={1} matchCount={1} onReset={vi.fn()} renderRow={renderRow} />)
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /FüKW/ })).not.toBeInTheDocument()
  })

  it('rendert Gruppen-Header bei mehreren Gruppen', () => {
    const groups: DeviceLocationGroup[] = [
      { key: 'FüKW', label: 'FüKW', devices: [dev({ id: 'a', callSign: 'A' })] },
      { key: 'Lager', label: 'Lager', devices: [dev({ id: 'b', callSign: 'B' })] },
    ]
    render(<DeviceGroupedList groups={groups} query="" total={2} matchCount={2} onReset={vi.fn()} renderRow={renderRow} />)
    expect(screen.getByRole('button', { name: /FüKW/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lager/ })).toBeInTheDocument()
  })

  it('zeigt Kein-Treffer-Zustand und ruft onReset', async () => {
    const onReset = vi.fn()
    render(<DeviceGroupedList groups={[]} query="xyz" total={5} matchCount={0} onReset={onReset} renderRow={renderRow} />)
    expect(screen.getByText(/Keine Treffer/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /zurücksetzen/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
