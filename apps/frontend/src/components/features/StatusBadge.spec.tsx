import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import type { DeviceStatus } from '@radio-inventar/shared'

describe('StatusBadge', () => {
  it('renders all 4 status variants with correct labels', () => {
    const { rerender } = render(<StatusBadge status="AVAILABLE" />)
    expect(screen.getByText('Verfügbar')).toBeInTheDocument()

    rerender(<StatusBadge status="ON_LOAN" />)
    expect(screen.getByText('Ausgeliehen')).toBeInTheDocument()

    rerender(<StatusBadge status="DEFECT" />)
    expect(screen.getByText('Defekt')).toBeInTheDocument()

    rerender(<StatusBadge status="MAINTENANCE" />)
    expect(screen.getByText('Wartung')).toBeInTheDocument()
  })

  it('shows icon + label for accessibility', () => {
    render(<StatusBadge status="AVAILABLE" />)
    // Icon sollte aria-hidden sein
    const icon = document.querySelector('[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    // Label sollte sichtbar sein (nur 1x, kein doppelter sr-only)
    expect(screen.getByText('Verfügbar')).toBeInTheDocument()
  })

  it('hides label when showLabel is false but keeps sr-only', () => {
    render(<StatusBadge status="AVAILABLE" showLabel={false} />)
    // Nur sr-only Text sollte vorhanden sein
    const label = screen.getByText('Verfügbar')
    expect(label).toHaveClass('sr-only')
  })

  it('renders all 4 status variants with correct background colors from UX-Spec', () => {
    const { rerender, container } = render(<StatusBadge status="AVAILABLE" />)
    let badge = container.querySelector('[data-slot="badge"]') || container.firstChild
    // Light mode: #22c55e, Dark mode: #16a34a (from UX-Spec lines 436-441)
    expect(badge).toHaveClass('bg-[#22c55e]')
    expect(badge).toHaveClass('dark:bg-[#16a34a]')

    rerender(<StatusBadge status="ON_LOAN" />)
    badge = container.querySelector('[data-slot="badge"]') || container.firstChild
    // Light mode: #f59e0b, Dark mode: #d97706 (from UX-Spec)
    expect(badge).toHaveClass('bg-[#f59e0b]')
    expect(badge).toHaveClass('dark:bg-[#d97706]')

    rerender(<StatusBadge status="DEFECT" />)
    badge = container.querySelector('[data-slot="badge"]') || container.firstChild
    // Light mode: #ef4444, Dark mode: #dc2626 (from UX-Spec)
    expect(badge).toHaveClass('bg-[#ef4444]')
    expect(badge).toHaveClass('dark:bg-[#dc2626]')

    rerender(<StatusBadge status="MAINTENANCE" />)
    badge = container.querySelector('[data-slot="badge"]') || container.firstChild
    // Light mode: #6b7280, Dark mode: #9ca3af (from UX-Spec)
    expect(badge).toHaveClass('bg-[#6b7280]')
    expect(badge).toHaveClass('dark:bg-[#9ca3af]')
  })

  it('handles unknown status gracefully without crashing', () => {
    // Cast zu unknown status um Error Handling zu testen
    render(<StatusBadge status={'UNKNOWN' as unknown as DeviceStatus} />)
    expect(screen.getByText('Unbekannt')).toBeInTheDocument()
    expect(screen.getByText('Unbekannter Status')).toHaveClass('sr-only')
  })

  it('renders an icon for each status', () => {
    const { rerender, container } = render(<StatusBadge status="AVAILABLE" />)
    // Check icon exists (lucide icons render as SVG)
    expect(container.querySelector('svg')).toBeInTheDocument()

    // Verify different statuses have icons (not comparing innerHTML which is fragile)
    rerender(<StatusBadge status="DEFECT" />)
    expect(container.querySelector('svg')).toBeInTheDocument()

    rerender(<StatusBadge status="ON_LOAN" />)
    expect(container.querySelector('svg')).toBeInTheDocument()

    rerender(<StatusBadge status="MAINTENANCE" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
