
import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useActiveLoans, useReturnDevice, type ActiveLoan } from '@/api/loans'
import { LoanedDeviceList } from '@/components/features/LoanedDeviceList'
import { ReturnDialog } from '@/components/features/ReturnDialog'
import { getUserFriendlyErrorMessage } from '@/lib/error-messages'

export const Route = createFileRoute('/return')({
  component: ReturnPage,
})

function ReturnPage() {
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const {
    data: loans = [],
    isLoading,
    error,
    refetch
  } = useActiveLoans()

  const { mutate: returnDevice, isPending: isReturning } = useReturnDevice()

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

      <LoanedDeviceList
        loans={loans}
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
