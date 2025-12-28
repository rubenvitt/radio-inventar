import { useDevices } from '@/api/devices'
import { LoadingState } from '@/components/features/LoadingState'
import { ErrorState } from '@/components/features/ErrorState'
import { SelectableDeviceCard } from './SelectableDeviceCard'
import { DeviceStatusEnum } from '@radio-inventar/shared'

interface DeviceSelectorProps {
  selectedDeviceId: string | null
  onSelect: (deviceId: string) => void
}

export function DeviceSelector({ selectedDeviceId, onSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading, error, refetch } = useDevices()

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (!devices) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Gerätedaten nicht verfügbar
      </p>
    )
  }

  if (devices.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Keine Geräte vorhanden
      </p>
    )
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="listbox"
      aria-label="Gerät auswählen"
    >
      {devices.map(device => (
        <SelectableDeviceCard
          key={device.id}
          device={device}
          deviceId={device.id}
          isSelected={selectedDeviceId === device.id}
          isSelectable={device.status === DeviceStatusEnum.enum.AVAILABLE}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
