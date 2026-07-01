import { useDevices } from '@/api/devices'
import { useDeviceFilter } from '@/hooks/useDeviceFilter'
import { LoadingState } from '@/components/features/LoadingState'
import { ErrorState } from '@/components/features/ErrorState'
import { DeviceFilterBar } from './DeviceFilterBar'
import { DeviceGroupedList } from './DeviceGroupedList'
import { DeviceRow } from './DeviceRow'
import { DeviceStatusEnum } from '@radio-inventar/shared'

interface DeviceSelectorProps {
  selectedDeviceIds: string[]
  onSelect: (deviceId: string) => void
}

export function DeviceSelector({ selectedDeviceIds, onSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading, error, refetch } = useDevices()
  const { query, setQuery, status, setStatus, groups, total, matchCount, reset } = useDeviceFilter(devices ?? [])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (!devices || devices.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Keine Geräte vorhanden</p>
  }

  return (
    <div role="listbox" aria-label="Gerät auswählen">
      <DeviceFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        matchCount={matchCount}
        total={total}
      />
      <DeviceGroupedList
        groups={groups}
        query={query}
        total={total}
        matchCount={matchCount}
        onReset={reset}
        renderRow={(device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onSelect={onSelect}
            selectable={device.status === DeviceStatusEnum.enum.AVAILABLE}
            selected={selectedDeviceIds.includes(device.id)}
          />
        )}
      />
    </div>
  )
}
