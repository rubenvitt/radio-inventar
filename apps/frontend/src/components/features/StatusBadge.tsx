import { Check, User, X, Wrench, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DeviceStatus } from '@radio-inventar/shared'

interface StatusBadgeProps {
  status: DeviceStatus
  showLabel?: boolean
  className?: string
}

interface DeviceStatusMeta {
  label: string
  icon: LucideIcon
  badgeClassName: string
  indicatorClassName: string
}

// WCAG AA Kontrast: 4.5:1 für normale Text
// Helle Hintergründe (available, on-loan) → dunkler Text
// Dunkle Hintergründe (defect, maintenance) → heller Text
// UX-Spec Farben: Exact Hex values from docs/ux-design-specification.md (lines 436-441)
export const deviceStatusMeta: Record<DeviceStatus, DeviceStatusMeta> = {
  AVAILABLE: {
    label: 'Verfügbar',
    icon: Check,
    badgeClassName: 'bg-[#22c55e] dark:bg-[#16a34a] text-green-950 dark:text-green-950',
    indicatorClassName:
      'border-[#22c55e]/30 bg-[#22c55e]/14 text-[#166534] dark:border-[#16a34a]/50 dark:bg-[#16a34a]/20 dark:text-[#86efac]',
  },
  ON_LOAN: {
    label: 'Ausgeliehen',
    icon: User,
    badgeClassName: 'bg-[#f59e0b] dark:bg-[#d97706] text-amber-950 dark:text-amber-950',
    indicatorClassName:
      'border-[#f59e0b]/30 bg-[#f59e0b]/14 text-[#92400e] dark:border-[#d97706]/50 dark:bg-[#d97706]/20 dark:text-[#fcd34d]',
  },
  DEFECT: {
    label: 'Defekt',
    icon: X,
    badgeClassName: 'bg-[#ef4444] dark:bg-[#dc2626] text-red-950 dark:text-red-950',
    indicatorClassName:
      'border-[#ef4444]/30 bg-[#ef4444]/14 text-[#991b1b] dark:border-[#dc2626]/50 dark:bg-[#dc2626]/20 dark:text-[#fca5a5]',
  },
  MAINTENANCE: {
    label: 'Wartung',
    icon: Wrench,
    // WCAG AA: Dunkler Text auf grauem Hintergrund für Kontrast >= 4.5:1
    badgeClassName: 'bg-[#6b7280] dark:bg-[#9ca3af] text-zinc-900 dark:text-zinc-950',
    indicatorClassName:
      'border-slate-400/40 bg-slate-500/12 text-slate-700 dark:border-slate-300/30 dark:bg-slate-300/12 dark:text-slate-200',
  },
}

export function getDeviceStatusMeta(status: DeviceStatus) {
  return deviceStatusMeta[status]
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const config = getDeviceStatusMeta(status)

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
        config.badgeClassName,
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
