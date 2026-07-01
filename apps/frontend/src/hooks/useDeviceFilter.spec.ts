import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeviceFilter } from './useDeviceFilter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: Math.random().toString(36).slice(2),
    callSign: 'Florian 4-21',
    serialNumber: null,
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('useDeviceFilter', () => {
  it('startet mit ALL und leerer Query, total = matchCount', () => {
    const devices = [dev(), dev({ callSign: 'B' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    expect(result.current.query).toBe('')
    expect(result.current.status).toBe('ALL')
    expect(result.current.total).toBe(2)
    expect(result.current.matchCount).toBe(2)
  })

  it('filtert bei setQuery und aktualisiert matchCount', () => {
    const devices = [dev({ callSign: 'Florian 4-21' }), dev({ callSign: 'Rotkreuz 1' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    act(() => result.current.setQuery('rotkreuz'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.matchCount).toBe(1)
    expect(result.current.total).toBe(2)
  })

  it('gruppiert das gefilterte Ergebnis nach Standort', () => {
    const devices = [dev({ location: 'Lager' }), dev({ location: 'FüKW' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    expect(result.current.groups.map((g) => g.label)).toEqual(['FüKW', 'Lager'])
  })

  it('reset setzt Query und Status zurück', () => {
    const devices = [dev({ status: 'AVAILABLE' }), dev({ status: 'ON_LOAN' })]
    const { result } = renderHook(() => useDeviceFilter(devices))
    act(() => {
      result.current.setQuery('x')
      result.current.setStatus('ON_LOAN')
    })
    act(() => result.current.reset())
    expect(result.current.query).toBe('')
    expect(result.current.status).toBe('ALL')
    expect(result.current.matchCount).toBe(2)
  })
})
