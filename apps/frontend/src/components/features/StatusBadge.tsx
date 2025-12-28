import { Check, User, X, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DeviceStatus } from '@radio-inventar/shared'

interface StatusBadgeProps {
  status: DeviceStatus
  showLabel?: boolean
  className?: string
}

// WCAG AA Kontrast: 4.5:1 für normale Text
// Helle Hintergründe (available, on-loan) → dunkler Text
// Dunkle Hintergründe (defect, maintenance) → heller Text
// UX-Spec Farben: Exact Hex values from docs/ux-design-specification.md (lines 436-441)
const statusConfig: Record<DeviceStatus, { label: string; icon: typeof Check; className: string }> = {
  AVAILABLE: {
    label: 'Verfügbar',
    icon: Check,
    className: 'bg-[#22c55e] dark:bg-[#16a34a] text-green-950 dark:text-green-950',
  },
  ON_LOAN: {
    label: 'Ausgeliehen',
    icon: User,
    className: 'bg-[#f59e0b] dark:bg-[#d97706] text-amber-950 dark:text-amber-950',
  },
  DEFECT: {
    label: 'Defekt',
    icon: X,
    className: 'bg-[#ef4444] dark:bg-[#dc2626] text-red-950 dark:text-red-950',
  },
  MAINTENANCE: {
    label: 'Wartung',
    icon: Wrench,
    // WCAG AA: Dunkler Text auf grauem Hintergrund für Kontrast >= 4.5:1
    className: 'bg-[#6b7280] dark:bg-[#9ca3af] text-zinc-900 dark:text-zinc-950',
  },
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  // Defensive: Handle ungültigen Status graceful (silently in production)
  if (!config) {
    return (
      <Badge className={cn('flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground', className)}>
        <span>Unbekannt</span>
        <span className="sr-only">Unbekannter Status</span>
      </Badge>
    )
  }

  const Icon = config.icon

  return (
    <Badge
      className={cn(
        'flex items-center gap-1.5 px-2 py-1',
        config.className,
        className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {showLabel && <span>{config.label}</span>}
      {/* sr-only nur wenn Label versteckt, sonst doppelt */}
      {!showLabel && <span className="sr-only">{config.label}</span>}
    </Badge>
  )
}
