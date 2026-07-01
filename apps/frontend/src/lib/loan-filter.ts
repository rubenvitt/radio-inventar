import type { ActiveLoan } from '@/api/loans'
import { normalizeSearchText } from './device-filter'

export function filterLoans(loans: ActiveLoan[], query: string): ActiveLoan[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return loans
  return loans.filter((loan) => {
    const haystack = normalizeSearchText(`${loan.device.callSign} ${loan.borrowerName}`)
    return terms.every((term) => haystack.includes(term))
  })
}
