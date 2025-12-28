import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeviceCard } from './DeviceCard'
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

describe('DeviceCard', () => {
  it('renders device callSign', () => {
    render(<DeviceCard device={mockDevice} />)
    expect(screen.getByText('Florian 4-23')).toBeInTheDocument()
  })

  it('shows StatusBadge with correct status', () => {
    render(<DeviceCard device={mockDevice} />)
    // StatusBadge sollte AVAILABLE Status zeigen
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('disables button when status is not available', () => {
    const onLoanDevice: DeviceWithLoanInfo = { ...mockDevice, status: 'ON_LOAN' }
    render(<DeviceCard device={onLoanDevice} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Vergeben')
  })

  it('enables button when status is available', () => {
    render(<DeviceCard device={mockDevice} />)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent('Ausleihen')
  })

  it('calls onSelect when button clicked', () => {
    const onSelect = vi.fn()
    render(<DeviceCard device={mockDevice} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('test-001')
  })

  it('has h-full class for proper card height', () => {
    const { container } = render(<DeviceCard device={mockDevice} />)
    const card = container.firstChild
    // Card uses h-full to fill available height in grid
    expect(card).toHaveClass('h-full')
  })

  it('action button has touch-target-lg class (64px min)', () => {
    render(<DeviceCard device={mockDevice} />)
    const button = screen.getByRole('button')
    // TouchButton with touchSize="lg" uses touch-target-lg CSS class
    // Actual pixel sizes (64px) are defined in globals.css
    expect(button).toHaveClass('touch-target-lg')
  })

  it('respects disabled prop regardless of status', () => {
    render(<DeviceCard device={mockDevice} disabled={true} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('has aria-label for accessibility', () => {
    render(<DeviceCard device={mockDevice} />)
    const button = screen.getByRole('button')
    // Use flexible matching - aria-label contains device name and action
    expect(button).toHaveAttribute('aria-label')
    const ariaLabel = button.getAttribute('aria-label')
    expect(ariaLabel).toContain('Florian 4-23')
    expect(ariaLabel).toMatch(/ausleihen|vergeben/i)
  })

  it('shows borrower name when device is on loan', () => {
    const onLoanDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'ON_LOAN',
      borrowerName: 'Max Mustermann',
    }
    render(<DeviceCard device={onLoanDevice} />)
    // DeviceCard shows borrower name directly (no prefix text)
    expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument()
  })

  it('shows borrowedAt timestamp when available', () => {
    const onLoanDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      status: 'ON_LOAN',
      borrowerName: 'Max Mustermann',
      borrowedAt: new Date('2025-12-16T14:30:00'),
    }
    render(<DeviceCard device={onLoanDevice} />)
    // Check that time is displayed (format: HH:MM Uhr)
    expect(screen.getByText(/\d{2}:\d{2}.*Uhr/)).toBeInTheDocument()
  })

  it('sanitizes callSign to prevent HTML injection', () => {
    const xssDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      callSign: '<script>alert("xss")</script>',
    }
    render(<DeviceCard device={xssDevice} />)
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
    render(<DeviceCard device={xssDevice} />)
    // HTML tags should be stripped
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('does not crash when onSelect is undefined', () => {
    render(<DeviceCard device={mockDevice} />)
    const button = screen.getByRole('button')
    // Should not throw when clicked with no handler
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('sanitizes aria-label from XSS in callSign', () => {
    const xssDevice: DeviceWithLoanInfo = {
      ...mockDevice,
      callSign: 'Test" onmouseover="alert(1)',
    }
    render(<DeviceCard device={xssDevice} />)
    const button = screen.getByRole('button')
    const ariaLabel = button.getAttribute('aria-label')
    // Quotes should be stripped from aria-label
    expect(ariaLabel).not.toContain('"')
    expect(ariaLabel).toContain('Test')
  })

  it('has semantic article role for better accessibility', () => {
    render(<DeviceCard device={mockDevice} />)
    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
    expect(article).toHaveAttribute('aria-label', 'Gerät Florian 4-23')
  })
})
