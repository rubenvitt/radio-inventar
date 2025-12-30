import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TouchButton } from '@/components/ui/touch-button'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import type { DeviceWithLoanInfo } from '@/api/devices'

/**
 * Sanitizes a string for safe display in the UI.
 * Removes potentially dangerous characters while preserving normal text.
 * Defense-in-depth: Handles HTML injection, attribute escaping, unicode attacks.
 */
function sanitizeForDisplay(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '')                         // Remove < and > to prevent HTML injection
    .replace(/["'`]/g, '')                        // Remove quotes that could escape attributes
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, '') // Remove zero-width and directional chars (RTL attacks)
    .replace(/[\x00-\x1F\x7F]/g, '')              // Remove control characters
    .trim();
}

interface DeviceCardProps {
  device: DeviceWithLoanInfo
  onSelect?: (deviceId: string) => void
  disabled?: boolean     // Explizite Deaktivierung (z.B. während Loading)
  className?: string
}

function DeviceCardComponent({ device, onSelect, disabled, className }: DeviceCardProps) {
  const isAvailable = device.status === 'AVAILABLE'
  const isDisabled = disabled || !isAvailable

  return (
    <Card
      role="article"
      aria-label={`Gerät ${sanitizeForDisplay(device.callSign)}`}
      className={cn(
        'overflow-hidden h-full',
        className
      )}
    >
      <CardContent className="flex flex-col h-full p-4">
        {/* Header: Status Badge + Call Sign */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold leading-tight">
              {sanitizeForDisplay(device.callSign)}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sanitizeForDisplay(device.deviceType)}
            </p>
            {device.notes && (
              <p className="text-sm text-muted-foreground/80 mt-1 line-clamp-2">
                {sanitizeForDisplay(device.notes)}
              </p>
            )}
          </div>
          <StatusBadge status={device.status} showLabel />
        </div>

        {/* Loan Info - fixed height area */}
        <div className="flex-1 py-3">
          {device.borrowerName && (
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{sanitizeForDisplay(device.borrowerName)}</span>
                {device.borrowedAt && (
                  <span className="ml-1">
                    seit {device.borrowedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Action Button - always at bottom */}
        <TouchButton
          onClick={() => onSelect?.(device.id)}
          disabled={isDisabled}
          touchSize="lg"
          variant={isAvailable ? 'default' : 'secondary'}
          className="w-full"
          aria-label={isAvailable ? `${sanitizeForDisplay(device.callSign)} ausleihen` : `${sanitizeForDisplay(device.callSign)} ist vergeben`}
        >
          {isAvailable ? 'Ausleihen' : 'Vergeben'}
        </TouchButton>
      </CardContent>
    </Card>
  )
}

function arePropsEqual(
  prevProps: DeviceCardProps,
  nextProps: DeviceCardProps
): boolean {
  return (
    prevProps.device.id === nextProps.device.id &&
    prevProps.device.callSign === nextProps.device.callSign &&
    prevProps.device.deviceType === nextProps.device.deviceType &&
    prevProps.device.notes === nextProps.device.notes &&
    prevProps.device.status === nextProps.device.status &&
    prevProps.device.borrowerName === nextProps.device.borrowerName &&
    prevProps.device.borrowedAt?.getTime() === nextProps.device.borrowedAt?.getTime() &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.className === nextProps.className
  )
}

export const DeviceCard = memo(DeviceCardComponent, arePropsEqual)
