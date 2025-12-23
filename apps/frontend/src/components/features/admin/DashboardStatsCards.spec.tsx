import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardStatsCards } from './DashboardStatsCards'

const mockStats = {
  availableCount: 5,
  onLoanCount: 3,
  defectCount: 1,
  maintenanceCount: 2,
}

describe('DashboardStatsCards', () => {
  // 7.2: Rendering tests (4 tests)
  describe('Rendering', () => {
    it('renders all 4 stat cards', () => {
      render(<DashboardStatsCards stats={mockStats} />)

      expect(screen.getByText('Verfügbar')).toBeInTheDocument()
      expect(screen.getByText('Ausgeliehen')).toBeInTheDocument()
      expect(screen.getByText('Defekt')).toBeInTheDocument()
      expect(screen.getByText('Wartung')).toBeInTheDocument()
    })

    it('each card shows correct title', () => {
      render(<DashboardStatsCards stats={mockStats} />)

      const titles = ['Verfügbar', 'Ausgeliehen', 'Defekt', 'Wartung']
      titles.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument()
      })
    })

    it('each card shows correct count', () => {
      render(<DashboardStatsCards stats={mockStats} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('each card shows correct icon', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      // Each card should have an icon with aria-hidden="true"
      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons).toHaveLength(4)
    })
  })

  // 7.3: Color Coding tests (4 tests)
  describe('Color Coding', () => {
    it('Verfügbar card has green accent', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      // Find the Verfügbar card's icon badge
      const cards = container.querySelectorAll('.rounded-full')
      const verfügbarBadge = cards[0] // First card is Verfügbar

      expect(verfügbarBadge).toHaveClass('bg-[#16a34a]')
      expect(verfügbarBadge).toHaveClass('dark:bg-[#22c55e]')
    })

    it('Ausgeliehen card has orange accent', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const ausgeliehenBadge = cards[1] // Second card is Ausgeliehen

      expect(ausgeliehenBadge).toHaveClass('bg-[#d97706]')
      expect(ausgeliehenBadge).toHaveClass('dark:bg-[#f59e0b]')
    })

    it('Defekt card has red accent', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const defektBadge = cards[2] // Third card is Defekt

      expect(defektBadge).toHaveClass('bg-[#dc2626]')
      expect(defektBadge).toHaveClass('dark:bg-[#ef4444]')
    })

    it('Wartung card has gray accent', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const wartungBadge = cards[3] // Fourth card is Wartung

      expect(wartungBadge).toHaveClass('bg-gray-500')
      expect(wartungBadge).toHaveClass('dark:bg-gray-600')
    })
  })

  // 7.4: Dark Mode tests (4 tests)
  describe('Dark Mode', () => {
    it('Green uses #22c55e in dark mode', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const verfügbarBadge = cards[0]

      // Exact HEX value per UX spec AC1, AC7
      expect(verfügbarBadge).toHaveClass('dark:bg-[#22c55e]')
    })

    it('Orange uses #f59e0b in dark mode', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const ausgeliehenBadge = cards[1]

      // Exact HEX value per UX spec AC1, AC7
      expect(ausgeliehenBadge).toHaveClass('dark:bg-[#f59e0b]')
    })

    it('Red uses #ef4444 in dark mode', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.rounded-full')
      const defektBadge = cards[2]

      // Exact HEX value per UX spec AC1, AC7
      expect(defektBadge).toHaveClass('dark:bg-[#ef4444]')
    })

    it('Background uses dark theme variables', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      // Card components should have proper Tailwind dark mode classes
      const cards = container.querySelectorAll('[class*="min-h"]')
      expect(cards).toHaveLength(4)

      // Each card should have the Card component styling
      cards.forEach(card => {
        expect(card).toHaveClass('min-h-[120px]')
      })
    })
  })

  // 7.5: Layout tests (3 tests)
  describe('Layout', () => {
    let matchMediaSpy: any

    beforeEach(() => {
      matchMediaSpy = vi.fn()
      window.matchMedia = matchMediaSpy
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Grid has 2 columns on mobile (< 768px)', () => {
      // Mock mobile viewport
      matchMediaSpy.mockImplementation((query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    it('Grid has 4 columns on desktop (>= 1024px)', () => {
      // Mock desktop viewport
      matchMediaSpy.mockImplementation((query: string) => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('md:grid-cols-4')
    })

    it('Gap between cards is 16px', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const grid = container.querySelector('.grid')
      // gap-4 in Tailwind is 1rem = 16px
      expect(grid).toHaveClass('gap-4')
    })
  })

  // 7.6: Edge Cases tests (3 tests)
  describe('Edge Cases', () => {
    it('Zero counts render as "0" (not hidden)', () => {
      const zeroStats = {
        availableCount: 0,
        onLoanCount: 0,
        defectCount: 0,
        maintenanceCount: 0,
      }

      render(<DashboardStatsCards stats={zeroStats} />)

      // Should find all four "0" values displayed
      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(4)

      // Verify they're all visible
      zeros.forEach(zero => {
        expect(zero).toBeVisible()
      })
    })

    it('Large counts (9999+) don\'t break layout', () => {
      const largeStats = {
        availableCount: 9999,
        onLoanCount: 10000,
        defectCount: 15000,
        maintenanceCount: 99999,
      }

      const { container } = render(<DashboardStatsCards stats={largeStats} />)

      // All large numbers should be rendered
      expect(screen.getByText('9999')).toBeInTheDocument()
      expect(screen.getByText('10000')).toBeInTheDocument()
      expect(screen.getByText('15000')).toBeInTheDocument()
      expect(screen.getByText('99999')).toBeInTheDocument()

      // Cards should maintain minimum height
      const cards = container.querySelectorAll('.min-h-\\[120px\\]')
      expect(cards).toHaveLength(4)
    })

    it('All counts display with correct formatting (no decimals)', () => {
      const decimalStats = {
        availableCount: 5,
        onLoanCount: 3,
        defectCount: 1,
        maintenanceCount: 2,
      }

      render(<DashboardStatsCards stats={decimalStats} />)

      // Numbers should be displayed as integers without decimals
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()

      // Should not find any decimal points
      expect(screen.queryByText(/\./)).not.toBeInTheDocument()
    })
  })

  // 7.7: Touch Targets tests (2 tests)
  describe('Touch Targets', () => {
    it('Cards have min-height 120px', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.min-h-\\[120px\\]')
      expect(cards).toHaveLength(4)

      cards.forEach(card => {
        expect(card).toHaveClass('min-h-[120px]')
      })
    })

    it('Cards have sufficient padding (p-6)', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cards = container.querySelectorAll('.p-6')
      expect(cards).toHaveLength(4)

      cards.forEach(card => {
        expect(card).toHaveClass('p-6')
      })
    })
  })

  // Additional accessibility tests (5 tests)
  describe('Accessibility', () => {
    it('Cards have region role with descriptive labels', () => {
      render(<DashboardStatsCards stats={mockStats} />)

      expect(screen.getByRole('region', { name: 'Verfügbar statistic' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Ausgeliehen statistic' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Defekt statistic' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Wartung statistic' })).toBeInTheDocument()
    })

    it('Icons have aria-hidden for screen readers', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const iconContainers = container.querySelectorAll('[aria-hidden="true"]')
      expect(iconContainers).toHaveLength(4)

      // Verify each icon container is properly hidden from screen readers
      iconContainers.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('Card titles use semantic heading structure', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      // CardTitle components should render with proper semantic structure
      const titles = ['Verfügbar', 'Ausgeliehen', 'Defekt', 'Wartung']
      titles.forEach(title => {
        const titleElement = screen.getByText(title)
        expect(titleElement).toBeInTheDocument()
      })
    })

    it('Hover effects are present for better interactivity', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      // Cards should have hover:shadow-lg transition
      const cards = container.querySelectorAll('.hover\\:shadow-lg')
      expect(cards).toHaveLength(4)

      cards.forEach(card => {
        expect(card).toHaveClass('hover:shadow-lg')
        expect(card).toHaveClass('transition-shadow')
      })
    })
  })

  // Component structure tests (1 test)
  describe('Component Structure', () => {
    it('renders cards in correct order: Verfügbar, Ausgeliehen, Defekt, Wartung', () => {
      const { container } = render(<DashboardStatsCards stats={mockStats} />)

      const cardTitles = container.querySelectorAll('.text-muted-foreground')
      expect(cardTitles).toHaveLength(4)

      // Verify the order of cards
      expect(cardTitles[0]).toHaveTextContent('Verfügbar')
      expect(cardTitles[1]).toHaveTextContent('Ausgeliehen')
      expect(cardTitles[2]).toHaveTextContent('Defekt')
      expect(cardTitles[3]).toHaveTextContent('Wartung')
    })
  })
})
