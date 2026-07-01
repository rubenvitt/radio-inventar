import { describe, it, expect } from 'vitest'
import {
  normalizeSearchText,
  filterDevices,
  groupDevicesByLocation,
} from './device-filter'
import type { DeviceWithLoanInfo } from '@/api/devices'

function dev(over: Partial<DeviceWithLoanInfo> = {}): DeviceWithLoanInfo {
  return {
    id: Math.random().toString(36).slice(2),
    callSign: 'Florian 4-21',
    serialNumber: 'SN-001',
    deviceType: 'Handheld',
    location: 'FüKW',
    status: 'AVAILABLE',
    ...over,
  }
}

describe('normalizeSearchText', () => {
  it('senkt Groß/Klein und entfernt Umlaute', () => {
    expect(normalizeSearchText('FÜKW')).toBe('fukw')
    expect(normalizeSearchText('Fükw')).toBe('fukw')
  })
  it('mappt ß auf ss und trimmt', () => {
    expect(normalizeSearchText('  Straße ')).toBe('strasse')
  })
})

describe('filterDevices', () => {
  it('leere Query gibt alle zurück', () => {
    const list = [dev(), dev()]
    expect(filterDevices(list, { query: '', status: 'ALL' })).toHaveLength(2)
  })
  it('matcht callSign case-insensitiv als Substring', () => {
    const list = [dev({ callSign: 'Florian 4-21' }), dev({ callSign: 'Rotkreuz 1' })]
    const res = filterDevices(list, { query: '4-21', status: 'ALL' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-21')
  })
  it('matcht Standort und Gerätetyp', () => {
    const list = [dev({ callSign: 'A', location: 'Lager 3' }), dev({ callSign: 'B', location: 'FüKW' })]
    expect(filterDevices(list, { query: 'lager', status: 'ALL' })).toHaveLength(1)
  })
  it('verknüpft mehrere Terme mit UND', () => {
    const list = [
      dev({ callSign: 'Florian 4-21', location: 'FüKW' }),
      dev({ callSign: 'Florian 4-22', location: 'Lager' }),
    ]
    const res = filterDevices(list, { query: 'florian lager', status: 'ALL' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-22')
  })
  it('Umlaut-Query trifft Umlaut-Wert unabhängig von Schreibweise', () => {
    const list = [dev({ callSign: 'A', location: 'FüKW' })]
    expect(filterDevices(list, { query: 'fukw', status: 'ALL' })).toHaveLength(1)
  })
  it('ignoriert null-Felder ohne Fehler', () => {
    const list = [dev({ deviceType: null, serialNumber: null, location: null, callSign: 'X' })]
    expect(filterDevices(list, { query: 'x', status: 'ALL' })).toHaveLength(1)
  })
  it('Statusfilter AVAILABLE / ON_LOAN', () => {
    const list = [dev({ status: 'AVAILABLE' }), dev({ status: 'ON_LOAN' })]
    expect(filterDevices(list, { query: '', status: 'AVAILABLE' })).toHaveLength(1)
    expect(filterDevices(list, { query: '', status: 'ON_LOAN' })).toHaveLength(1)
  })
  it('Statusfilter UNAVAILABLE deckt DEFECT und MAINTENANCE ab', () => {
    const list = [dev({ status: 'DEFECT' }), dev({ status: 'MAINTENANCE' }), dev({ status: 'AVAILABLE' })]
    expect(filterDevices(list, { query: '', status: 'UNAVAILABLE' })).toHaveLength(2)
  })
  it('kombiniert Query und Status', () => {
    const list = [
      dev({ callSign: 'Florian 4-21', status: 'AVAILABLE' }),
      dev({ callSign: 'Florian 4-22', status: 'ON_LOAN' }),
    ]
    const res = filterDevices(list, { query: 'florian', status: 'ON_LOAN' })
    expect(res).toHaveLength(1)
    expect(res[0].callSign).toBe('Florian 4-22')
  })
})

describe('groupDevicesByLocation', () => {
  it('gruppiert nach Standort, alphabetisch', () => {
    const groups = groupDevicesByLocation([
      dev({ location: 'Lager' }),
      dev({ location: 'FüKW' }),
      dev({ location: 'FüKW' }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['FüKW', 'Lager'])
    expect(groups[0].devices).toHaveLength(2)
  })
  it('legt null/leere Standorte in "Ohne Standort" ganz ans Ende', () => {
    const groups = groupDevicesByLocation([
      dev({ location: null }),
      dev({ location: 'FüKW' }),
      dev({ location: '   ' }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['FüKW', 'Ohne Standort'])
    expect(groups[1].key).toBe('__none__')
    expect(groups[1].devices).toHaveLength(2)
  })
  it('trimmt Standort-Werte beim Gruppieren', () => {
    const groups = groupDevicesByLocation([dev({ location: 'FüKW' }), dev({ location: ' FüKW ' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].devices).toHaveLength(2)
  })
})
