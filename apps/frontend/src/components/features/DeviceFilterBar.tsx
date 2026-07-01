import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { DeviceStatusFilter } from '@/lib/device-filter'

export const STATUS_FILTER_OPTIONS: { value: DeviceStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Alle' },
  { value: 'AVAILABLE', label: 'Frei' },
  { value: 'ON_LOAN', label: 'Vergeben' },
  { value: 'UNAVAILABLE', label: 'Defekt·Wartung' },
]

interface DeviceFilterBarProps {
  query: string
  onQueryChange: (query: string) => void
  status: DeviceStatusFilter
  onStatusChange: (status: DeviceStatusFilter) => void
  matchCount: number
  total: number
  className?: string
}

export function DeviceFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  matchCount,
  total,
  className,
}: DeviceFilterBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur',
        className,
      )}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          inputMode="search"
          role="searchbox"
          aria-label="Geräte suchen"
          placeholder="Rufname oder Standort…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Suche zurücksetzen"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Nach Status filtern" className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isActive = status === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors touch-manipulation',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {matchCount === total ? `${total} Geräte` : `${matchCount} von ${total} Geräten`}
      </p>
    </div>
  )
}
