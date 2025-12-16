import { Link, useRouterState } from '@tanstack/react-router'
import { Radio, RotateCcw, LayoutGrid } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/loan', label: 'Ausleihen', icon: Radio },
  { to: '/return', label: 'Zurückgeben', icon: RotateCcw },
  { to: '/', label: 'Übersicht', icon: LayoutGrid },
] as const

export function Navigation() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to
          return (
            <Link
              key={to}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                // Touch-Target: 64x64px (WCAG AAA)
                'flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-lg',
                'transition-colors touch-manipulation',
                isActive
                  ? 'text-primary bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </Link>
          )
        })}
        <ThemeToggle />
      </div>
    </nav>
  )
}
