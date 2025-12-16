import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => {
        const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
        setTheme(next)
      }}
      className={cn(
        // Touch-Target: 64x64px (WCAG AAA)
        'flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-lg',
        'transition-colors touch-manipulation',
        'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
      aria-label={
        theme === 'dark'
          ? 'Zu Light Mode wechseln'
          : theme === 'light'
            ? 'Zu System Mode wechseln'
            : 'Zu Dark Mode wechseln'
      }
    >
      {theme === 'dark' ? (
        <Sun className="h-6 w-6" />
      ) : theme === 'light' ? (
        <Moon className="h-6 w-6" />
      ) : (
        <Monitor className="h-6 w-6" />
      )}
      <span className="text-xs mt-1 font-medium">
        {theme === 'dark' ? 'Light' : theme === 'light' ? 'System' : 'Dark'}
      </span>
    </button>
  )
}
