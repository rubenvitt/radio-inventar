import { describe, it, expect } from 'vitest'
import { filterLoans } from './loan-filter'
import type { ActiveLoan } from '@/api/loans'

function loan(over: Partial<ActiveLoan> = {}): ActiveLoan {
  return {
    id: Math.random().toString(36).slice(2),
    deviceId: 'd1',
    borrowerName: 'Meyer',
    borrowedAt: '2026-07-01T10:00:00Z',
    device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' },
    ...over,
  }
}

describe('filterLoans', () => {
  it('leere Query gibt alle zurück', () => {
    expect(filterLoans([loan(), loan()], '')).toHaveLength(2)
  })
  it('matcht Rufname', () => {
    const list = [loan({ device: { id: 'd1', callSign: 'Florian 4-21', status: 'ON_LOAN' } }), loan({ device: { id: 'd2', callSign: 'Rotkreuz 1', status: 'ON_LOAN' } })]
    expect(filterLoans(list, '4-21')).toHaveLength(1)
  })
  it('matcht Ausleiher-Name case-insensitiv', () => {
    const list = [loan({ borrowerName: 'Meyer' }), loan({ borrowerName: 'Schulze' })]
    const res = filterLoans(list, 'meyer')
    expect(res).toHaveLength(1)
    expect(res[0].borrowerName).toBe('Meyer')
  })
})
