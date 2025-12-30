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
          ? 'Aktuell: Dark Mode. Klicken für Light'
          : theme === 'light'
            ? 'Aktuell: Light Mode. Klicken für Auto'
            : 'Aktuell: Auto Mode. Klicken für Dark'
      }
    >
      {/* Zeigt aktuellen Zustand (nicht nächsten) */}
      {theme === 'dark' ? (
        <Moon className="h-6 w-6" />
      ) : theme === 'light' ? (
        <Sun className="h-6 w-6" />
      ) : (
        <Monitor className="h-6 w-6" />
      )}
      <span className="text-xs mt-1 font-medium">
        {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}
      </span>
    </button>
  )
}
