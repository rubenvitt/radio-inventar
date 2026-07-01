import { memo } from 'react'
import { Check } from 'lucide-react'
import { StatusBadge, getDeviceStatusMeta } from './StatusBadge'
import { sanitizeForDisplay } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import type { DeviceWithLoanInfo } from '@/api/devices'

interface DeviceRowProps {
  device: DeviceWithLoanInfo
  onSelect: (deviceId: string) => void
  selectable: boolean
  selected?: boolean
  className?: string
}

function DeviceRowComponent({ device, onSelect, selectable, selected, className }: DeviceRowProps) {
  const isSelectionMode = selected !== undefined
  const statusMeta = getDeviceStatusMeta(device.status)

  const secondary = device.borrowerName
    ? `${sanitizeForDisplay(device.borrowerName)}${
        device.borrowedAt
          ? ` · ${device.borrowedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
          : ''
      }`
    : sanitizeForDisplay(device.deviceType)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && selectable) {
      e.preventDefault()
      onSelect(device.id)
    }
  }

  return (
    <div
      role={isSelectionMode ? 'option' : 'button'}
      aria-selected={isSelectionMode ? selected : undefined}
      aria-disabled={!selectable}
      aria-label={`${sanitizeForDisplay(device.callSign)}${device.location ? `, ${sanitizeForDisplay(device.location)}` : ''}`}
      tabIndex={selectable ? 0 : -1}
      onClick={selectable ? () => onSelect(device.id) : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex min-h-[56px] items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors',
        selectable &&
          'cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/10 ring-2 ring-primary dark:bg-primary/20',
        !selectable && 'opacity-60',
        className,
      )}
    >
      <span
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full border', statusMeta?.indicatorClassName)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold leading-tight">{sanitizeForDisplay(device.callSign)}</div>
        <div className="truncate text-sm text-muted-foreground">{secondary}</div>
      </div>
      {isSelectionMode && selected ? (
        <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <StatusBadge status={device.status} showLabel />
      )}
    </div>
  )
}

function arePropsEqual(prev: DeviceRowProps, next: DeviceRowProps): boolean {
  return (
    prev.device.id === next.device.id &&
    prev.device.callSign === next.device.callSign &&
    prev.device.deviceType === next.device.deviceType &&
    prev.device.location === next.device.location &&
    prev.device.status === next.device.status &&
    prev.device.borrowerName === next.device.borrowerName &&
    prev.device.borrowedAt?.getTime() === next.device.borrowedAt?.getTime() &&
    prev.selectable === next.selectable &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    prev.className === next.className
  )
}

export const DeviceRow = memo(DeviceRowComponent, arePropsEqual)
