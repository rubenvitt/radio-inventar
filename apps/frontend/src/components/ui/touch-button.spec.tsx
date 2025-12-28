import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TouchButton } from './touch-button'

describe('TouchButton', () => {
  describe('Touch target sizes', () => {
    // Tests check for touch-target-* CSS classes from globals.css
    // Actual pixel sizes (44, 56, 64, 88px) are defined in CSS, not inline

    it('applies sm touch size (44px - WCAG AA)', () => {
      render(<TouchButton touchSize="sm">Small Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-sm')
    })

    it('applies md touch size (56px - Input fields)', () => {
      render(<TouchButton touchSize="md">Medium Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-md')
    })

    it('applies lg touch size (64px - WCAG AAA)', () => {
      render(<TouchButton touchSize="lg">Large Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-lg')
    })

    it('applies xl touch size (88px - Glove-optimized)', () => {
      render(<TouchButton touchSize="xl">Extra Large Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-xl')
    })
  })

  describe('Default touchSize', () => {
    it('defaults to md (56px) when touchSize is not specified', () => {
      render(<TouchButton>Default Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-md')
    })
  })

  describe('Touch action styles', () => {
    it('applies touch-action manipulation style for touch optimization', () => {
      render(<TouchButton>Touch Button</TouchButton>)
      const button = screen.getByRole('button')
      // Check inline style attribute for touch-action: manipulation
      expect(button.style.touchAction).toBe('manipulation')
    })

    it('applies text-lg class for larger text', () => {
      render(<TouchButton>Touch Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-lg')
    })
  })

  describe('Custom className', () => {
    it('merges custom className with touch classes', () => {
      render(
        <TouchButton touchSize="lg" className="custom-class bg-blue-500">
          Custom Button
        </TouchButton>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-lg')
      expect(button.style.touchAction).toBe('manipulation')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('bg-blue-500')
    })

    it('preserves all classes when className is provided', () => {
      render(
        <TouchButton touchSize="sm" className="mt-4 px-8">
          Button
        </TouchButton>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-sm')
      expect(button).toHaveClass('mt-4')
      expect(button).toHaveClass('px-8')
    })
  })

  describe('Button props passthrough', () => {
    it('passes variant prop to Button', () => {
      render(<TouchButton variant="destructive">Delete</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Delete')
      expect(button).toHaveAttribute('data-variant', 'destructive')
      expect(button).toHaveClass('bg-destructive')
    })

    it('passes disabled prop to Button', () => {
      render(<TouchButton disabled>Disabled Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('passes onClick handler to Button', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick}>Click Me</TouchButton>)
      const button = screen.getByRole('button')
      await user.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('passes type prop to Button', () => {
      render(<TouchButton type="submit">Submit</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('passes size prop to underlying Button variant', () => {
      render(<TouchButton size="sm">Small Variant</TouchButton>)
      const button = screen.getByRole('button')
      // Size variant should be applied (but not conflict with touchSize)
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Small Variant')
    })

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(
        <TouchButton onClick={handleClick} disabled>
          Disabled
        </TouchButton>
      )
      const button = screen.getByRole('button')
      await user.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Variant styling', () => {
    it('applies destructive variant classes', () => {
      render(<TouchButton variant="destructive">Delete</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'destructive')
      expect(button).toHaveClass('bg-destructive', 'text-white')
    })

    it('applies outline variant classes', () => {
      render(<TouchButton variant="outline">Outlined</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
      expect(button).toHaveClass('border', 'bg-background')
    })

    it('applies ghost variant classes', () => {
      render(<TouchButton variant="ghost">Ghost</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('applies secondary variant classes', () => {
      render(<TouchButton variant="secondary">Secondary</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'secondary')
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })

    it('applies default variant when no variant specified', () => {
      render(<TouchButton>Default</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'default')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })
  })

  describe('Accessibility', () => {
    it('renders as a button element', () => {
      render(<TouchButton>Accessible Button</TouchButton>)
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('supports aria-label for accessibility', () => {
      render(<TouchButton aria-label="Save document">💾</TouchButton>)
      const button = screen.getByRole('button', { name: 'Save document' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Save document')
    })

    it('supports aria-describedby', () => {
      render(
        <>
          <TouchButton aria-describedby="help-text">Submit</TouchButton>
          <span id="help-text">This will submit the form</span>
        </>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('has accessible text content', () => {
      render(<TouchButton>Click Here</TouchButton>)
      expect(screen.getByRole('button', { name: 'Click Here' })).toBeInTheDocument()
    })

    it('supports aria-pressed for toggle buttons', () => {
      render(<TouchButton aria-pressed="true">Toggle</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Interaction', () => {
    it('can be clicked multiple times when enabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick}>Multi Click</TouchButton>)
      const button = screen.getByRole('button')

      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('handles rapid clicking (multiple clicks in quick succession)', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick}>Rapid Click</TouchButton>)
      const button = screen.getByRole('button')

      // Simulate rapid clicks without delay
      await user.tripleClick(button)

      // Should register multiple clicks
      expect(handleClick).toHaveBeenCalled()
      expect(handleClick.mock.calls.length).toBeGreaterThan(0)
    })

    it('prevents clicks when disabled even with rapid clicking', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick} disabled>Disabled Rapid</TouchButton>)
      const button = screen.getByRole('button')

      // Attempt rapid clicks on disabled button
      await user.tripleClick(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('can be focused with keyboard', async () => {
      const user = userEvent.setup()
      render(<TouchButton>Focus Me</TouchButton>)
      const button = screen.getByRole('button')

      await user.tab()
      expect(button).toHaveFocus()
    })

    it('can be activated with keyboard (Enter)', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick}>Keyboard</TouchButton>)
      const button = screen.getByRole('button')

      button.focus()
      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('can be activated with keyboard (Space)', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<TouchButton onClick={handleClick}>Keyboard</TouchButton>)
      const button = screen.getByRole('button')

      button.focus()
      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('renders children as text', () => {
      render(<TouchButton>Text Content</TouchButton>)
      expect(screen.getByRole('button')).toHaveTextContent('Text Content')
    })

    it('renders children as React elements', () => {
      render(
        <TouchButton>
          <span>Icon</span>
          <span>Label</span>
        </TouchButton>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('IconLabel')
    })

    it('does not crash when onClick is undefined', async () => {
      const user = userEvent.setup()
      render(<TouchButton>No Handler</TouchButton>)
      const button = screen.getByRole('button')
      expect(() => user.click(button)).not.toThrow()
    })

    it('can have both touchSize and size props simultaneously', () => {
      // touchSize controls minimum dimensions, size controls Button variant
      render(
        <TouchButton touchSize="lg" size="sm">
          Dual Size
        </TouchButton>
      )
      const button = screen.getByRole('button')
      // Touch size should be applied (CSS class from globals.css)
      expect(button).toHaveClass('touch-target-lg')
      // Button should render without error
      expect(button).toBeInTheDocument()
    })

    it('works with form submission', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      render(
        <form onSubmit={handleSubmit}>
          <TouchButton type="submit">Submit Form</TouchButton>
        </form>
      )
      const button = screen.getByRole('button')
      button.click()
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    it('handles empty/whitespace-only children', () => {
      render(<TouchButton> </TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('handles undefined variant prop gracefully', () => {
      render(<TouchButton variant={undefined}>Undefined Variant</TouchButton>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      // Should fall back to default variant
      expect(button).toHaveAttribute('data-variant', 'default')
    })

    it('combines multiple style props correctly', () => {
      render(
        <TouchButton
          touchSize="xl"
          variant="destructive"
          size="lg"
          className="custom-class"
        >
          Combined Props
        </TouchButton>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('touch-target-xl')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveAttribute('data-variant', 'destructive')
      expect(button).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('asChild prop', () => {
    it('passes asChild prop to underlying Button', () => {
      render(
        <TouchButton asChild>
          <a href="/test">Link Button</a>
        </TouchButton>
      )
      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
    })
  })

  describe('Ref forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<TouchButton ref={ref}>Ref Button</TouchButton>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toHaveTextContent('Ref Button')
    })
  })
})
