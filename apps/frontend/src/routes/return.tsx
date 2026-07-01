
import { useState, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveLoans, useReturnDevice, type ActiveLoan } from '@/api/loans'
import { LoanedDeviceList } from '@/components/features/LoanedDeviceList'
import { ReturnDialog } from '@/components/features/ReturnDialog'
import { Input } from '@/components/ui/input'
import { getUserFriendlyErrorMessage } from '@/lib/error-messages'
import { filterLoans } from '@/lib/loan-filter'

export const Route = createFileRoute('/return')({
  component: ReturnPage,
})

export function ReturnPage() {
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [query, setQuery] = useState('')

  const {
    data: loans = [],
    isLoading,
    error,
    refetch
  } = useActiveLoans()

  const { mutate: returnDevice, isPending: isReturning } = useReturnDevice()

  const filteredLoans = useMemo(() => filterLoans(loans, query), [loans, query])

  const handleLoanClick = useCallback((loan: ActiveLoan) => {
    setSelectedLoan(loan)
    setIsDialogOpen(true)
  }, [])

  const handleConfirmReturn = useCallback((loanId: string, returnNote: string | null) => {
    returnDevice(
      { loanId, returnNote },
      {
        onSuccess: () => {
          toast.success('Gerät erfolgreich zurückgegeben')
          setIsDialogOpen(false)
          setSelectedLoan(null)
        },
        onError: (error) => {
          toast.error('Rückgabe fehlgeschlagen', {
            description: getUserFriendlyErrorMessage(error),
          })
        },
      }
    )
  }, [returnDevice])

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Geräte zurückgeben</h1>

      {loans.length > 0 && (
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            role="searchbox"
            aria-label="Ausleihen durchsuchen"
            placeholder="Rufname oder Name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Suche zurücksetzen"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <LoanedDeviceList
        loans={filteredLoans}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onLoanClick={handleLoanClick}
      />

      {selectedLoan && (
        <ReturnDialog
          loan={selectedLoan}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onConfirm={handleConfirmReturn}
          isPending={isReturning}
        />
      )}
    </div>
  )
}
