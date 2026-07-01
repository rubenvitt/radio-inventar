import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceGroup } from './DeviceGroup'

describe('DeviceGroup', () => {
  it('zeigt Label und Anzahl', () => {
    render(<DeviceGroup label="FüKW" count={8}><div>inhalt</div></DeviceGroup>)
    expect(screen.getByRole('button', { name: /FüKW/ })).toHaveTextContent('8')
  })

  it('klappt bei Klick zu und wieder auf', async () => {
    render(<DeviceGroup label="FüKW" count={2}><div>inhalt</div></DeviceGroup>)
    expect(screen.getByText('inhalt')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /FüKW/ }))
    expect(screen.queryByText('inhalt')).not.toBeInTheDocument()
  })

  it('forceOpen zeigt Inhalt immer und deaktiviert das Zuklappen', async () => {
    render(<DeviceGroup label="FüKW" count={2} forceOpen><div>inhalt</div></DeviceGroup>)
    await userEvent.click(screen.getByRole('button', { name: /FüKW/ }))
    expect(screen.getByText('inhalt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /FüKW/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
