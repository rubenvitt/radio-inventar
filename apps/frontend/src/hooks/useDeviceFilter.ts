import { useMemo, useState } from 'react'
import type { DeviceWithLoanInfo } from '@/api/devices'
import {
  filterDevices,
  groupDevicesByLocation,
  type DeviceStatusFilter,
  type DeviceLocationGroup,
} from '@/lib/device-filter'

export interface UseDeviceFilterResult {
  query: string
  setQuery: (query: string) => void
  status: DeviceStatusFilter
  setStatus: (status: DeviceStatusFilter) => void
  filtered: DeviceWithLoanInfo[]
  groups: DeviceLocationGroup[]
  total: number
  matchCount: number
  reset: () => void
}

export function useDeviceFilter(devices: DeviceWithLoanInfo[]): UseDeviceFilterResult {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<DeviceStatusFilter>('ALL')

  const filtered = useMemo(
    () => filterDevices(devices, { query, status }),
    [devices, query, status],
  )
  const groups = useMemo(() => groupDevicesByLocation(filtered), [filtered])

  return {
    query,
    setQuery,
    status,
    setStatus,
    filtered,
    groups,
    total: devices.length,
    matchCount: filtered.length,
    reset: () => {
      setQuery('')
      setStatus('ALL')
    },
  }
}
