import type { DeviceWithLoanInfo } from '@/api/devices'

export type DeviceStatusFilter = 'ALL' | 'AVAILABLE' | 'ON_LOAN' | 'UNAVAILABLE'

export interface DeviceFilterState {
  query: string
  status: DeviceStatusFilter
}

export interface DeviceLocationGroup {
  key: string
  label: string
  devices: DeviceWithLoanInfo[]
}

export const NO_LOCATION_KEY = '__none__'
const NO_LOCATION_LABEL = 'Ohne Standort'

/**
 * Normalises text for accent-insensitive, case-insensitive substring search.
 * Lowercases, strips combining diacritics (ä→a, ö→o, ü→u via NFD) and maps ß→ss
 * (ß is not a combining diacritic, so NFD leaves it untouched).
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks (from NFD)
    .replace(/ß/g, 'ss')
    .trim()
}

function deviceMatchesQuery(device: DeviceWithLoanInfo, terms: string[]): boolean {
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(
    [device.callSign, device.deviceType, device.serialNumber, device.location]
      .filter(Boolean)
      .join(' '),
  )
  return terms.every((term) => haystack.includes(term))
}

function deviceMatchesStatus(device: DeviceWithLoanInfo, status: DeviceStatusFilter): boolean {
  switch (status) {
    case 'ALL':
      return true
    case 'AVAILABLE':
      return device.status === 'AVAILABLE'
    case 'ON_LOAN':
      return device.status === 'ON_LOAN'
    case 'UNAVAILABLE':
      return device.status === 'DEFECT' || device.status === 'MAINTENANCE'
  }
}

export function filterDevices(
  devices: DeviceWithLoanInfo[],
  { query, status }: DeviceFilterState,
): DeviceWithLoanInfo[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  return devices.filter(
    (device) => deviceMatchesStatus(device, status) && deviceMatchesQuery(device, terms),
  )
}

/**
 * Groups devices by trimmed `location`. Named locations come first sorted
 * alphabetically (de collation); devices without a location fall into a single
 * "Ohne Standort" group appended last. Input order is preserved within a group.
 */
export function groupDevicesByLocation(devices: DeviceWithLoanInfo[]): DeviceLocationGroup[] {
  const named = new Map<string, DeviceWithLoanInfo[]>()
  const none: DeviceWithLoanInfo[] = []

  for (const device of devices) {
    const location = device.location?.trim()
    if (location) {
      const bucket = named.get(location)
      if (bucket) bucket.push(device)
      else named.set(location, [device])
    } else {
      none.push(device)
    }
  }

  const groups: DeviceLocationGroup[] = [...named.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([label, groupDevices]) => ({ key: label, label, devices: groupDevices }))

  if (none.length > 0) {
    groups.push({ key: NO_LOCATION_KEY, label: NO_LOCATION_LABEL, devices: none })
  }

  return groups
}
