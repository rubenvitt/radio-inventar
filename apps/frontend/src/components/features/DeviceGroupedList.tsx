import { PackageOpen } from 'lucide-react'
import { DeviceGroup } from './DeviceGroup'
import { TouchButton } from '@/components/ui/touch-button'
import type { DeviceLocationGroup } from '@/lib/device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

interface DeviceGroupedListProps {
  groups: DeviceLocationGroup[]
  query: string
  total: number
  matchCount: number
  onReset: () => void
  renderRow: (device: DeviceWithLoanInfo) => React.ReactNode
}

export function DeviceGroupedList({ groups, query, matchCount, onReset, renderRow }: DeviceGroupedListProps) {
  if (matchCount === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-4 text-center">
        <PackageOpen className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          {query.trim() ? `Keine Treffer für „${query.trim()}"` : 'Keine Geräte für diesen Filter'}
        </p>
        <TouchButton variant="outline" touchSize="lg" onClick={onReset}>
          Filter zurücksetzen
        </TouchButton>
      </div>
    )
  }

  const forceOpen = query.trim().length > 0

  // Nur eine Gruppe → flach ohne Header rendern.
  if (groups.length <= 1) {
    return <div className="flex flex-col gap-2 p-4">{groups[0]?.devices.map(renderRow)}</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map((group) => (
        <DeviceGroup key={group.key} label={group.label} count={group.devices.length} forceOpen={forceOpen}>
          {group.devices.map(renderRow)}
        </DeviceGroup>
      ))}
    </div>
  )
}
