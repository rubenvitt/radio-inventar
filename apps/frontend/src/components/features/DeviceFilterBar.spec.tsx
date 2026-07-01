import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceFilterBar } from './DeviceFilterBar'

function setup(over: Partial<React.ComponentProps<typeof DeviceFilterBar>> = {}) {
  const props = {
    query: '',
    onQueryChange: vi.fn(),
    status: 'ALL' as const,
    onStatusChange: vi.fn(),
    matchCount: 21,
    total: 21,
    ...over,
  }
  render(<DeviceFilterBar {...props} />)
  return props
}

describe('DeviceFilterBar', () => {
  it('meldet Tippen im Suchfeld', async () => {
    const props = setup()
    await userEvent.type(screen.getByRole('searchbox'), 'a')
    expect(props.onQueryChange).toHaveBeenCalledWith('a')
  })

  it('zeigt Clear-Button nur bei nicht-leerer Query und leert', async () => {
    const props = setup({ query: 'florian' })
    await userEvent.click(screen.getByRole('button', { name: /suche zurücksetzen/i }))
    expect(props.onQueryChange).toHaveBeenCalledWith('')
  })

  it('wechselt Status per Chip', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Frei' }))
    expect(props.onStatusChange).toHaveBeenCalledWith('AVAILABLE')
  })

  it('markiert den aktiven Status-Chip', () => {
    setup({ status: 'AVAILABLE' })
    expect(screen.getByRole('button', { name: 'Frei' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('zeigt den Trefferzähler', () => {
    setup({ matchCount: 5, total: 21 })
    expect(screen.getByText(/5 von 21 Geräten/i)).toBeInTheDocument()
  })
})
