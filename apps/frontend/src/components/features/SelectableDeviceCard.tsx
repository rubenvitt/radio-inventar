import { memo } from 'react'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import type { DeviceWithLoanInfo } from '@/api/devices'

/**
 * XSS Protection: Sanitize user-generated text for safe display
 *
 * Removes potentially dangerous characters:
 * - HTML tags (<, >)
 * - Quote characters (", ', `)
 * - Zero-width and RTL control characters
 * - ASCII control characters
 */
function sanitizeForDisplay(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '')                         // HTML Injection
    .replace(/["'`]/g, '')                        // Attribute Escaping
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, '') // Zero-Width/RTL Attacks
    .replace(/[\x00-\x1F\x7F]/g, '')              // Control Chars
    .trim();
}

interface SelectableDeviceCardProps {
  device: DeviceWithLoanInfo
  deviceId: string
  isSelected: boolean
  isSelectable: boolean
  onSelect: (deviceId: string) => void
}

function SelectableDeviceCardComponent({ device, deviceId, isSelected, isSelectable, onSelect }: SelectableDeviceCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isSelectable) {
      e.preventDefault()
      onSelect(deviceId)
    }
  }

  const cardClasses = cn(
    // Base
    "relative p-4 rounded-lg border transition-all duration-150",
    "min-h-[88px]",  // touch-target-xl
    "bg-card",

    // Selectable
    isSelectable && [
      "cursor-pointer",
      "hover:bg-accent hover:border-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    ],

    // Selected
    isSelected && [
      "ring-2 ring-primary",
      "bg-primary/10 dark:bg-primary/20",
      "border-primary",
    ],

    // Disabled
    !isSelectable && [
      "opacity-50",
      "cursor-not-allowed",
      "bg-muted/50",
    ]
  )

  const statusLabel = device.status === 'AVAILABLE' ? 'Verfügbar' :
                      device.status === 'ON_LOAN' ? 'Ausgeliehen' :
                      device.status === 'DEFECT' ? 'Defekt' : 'Wartung'

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={!isSelectable}
      aria-label={`${sanitizeForDisplay(device.callSign)} - ${statusLabel}`}
      tabIndex={isSelectable ? 0 : -1}
      className={cardClasses}
      onClick={isSelectable ? () => onSelect(deviceId) : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-tight">
            {sanitizeForDisplay(device.callSign)}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sanitizeForDisplay(device.deviceType)}
          </p>
        </div>
        <StatusBadge status={device.status} showLabel />
      </div>

      {/* Loan Info wenn ausgeliehen */}
      {device.borrowerName && (
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium">{sanitizeForDisplay(device.borrowerName)}</span>
          {device.borrowedAt && (
            <span className="ml-1">
              seit {device.borrowedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Memoize für Performance
function arePropsEqual(prev: SelectableDeviceCardProps, next: SelectableDeviceCardProps): boolean {
  return (
    prev.deviceId === next.deviceId &&
    prev.device.callSign === next.device.callSign &&
    prev.device.deviceType === next.device.deviceType &&
    prev.device.status === next.device.status &&
    prev.device.borrowerName === next.device.borrowerName &&
    prev.device.borrowedAt?.getTime() === next.device.borrowedAt?.getTime() &&
    prev.isSelected === next.isSelected &&
    prev.isSelectable === next.isSelectable &&
    prev.onSelect === next.onSelect
  )
}

export const SelectableDeviceCard = memo(SelectableDeviceCardComponent, arePropsEqual)
