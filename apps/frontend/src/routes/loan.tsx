
import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { DeviceSelector } from '@/components/features/DeviceSelector'
import { BorrowerInput } from '@/components/features/BorrowerInput'
import { ConfirmLoanButton } from '@/components/features/ConfirmLoanButton'
import { getUserFriendlyErrorMessage } from '@/lib/error-messages'
import { z } from 'zod'

// Validate search params
const loanSearchSchema = z.object({
  deviceId: z.string().optional(),
})

export const Route = createFileRoute('/loan')({
  validateSearch: loanSearchSchema,
  component: LoanPage,
})

function LoanPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

  // State for borrower name - deviceId comes from URL
  const [borrowerName, setBorrowerName] = useState('')
  const selectedDeviceId = search.deviceId ?? null

  const handleDeviceSelect = useCallback((deviceId: string) => {
    navigate({
      search: { deviceId },
      replace: true,
    })
  }, [navigate])

  const handleSuccess = useCallback(() => {
    toast.success('Gerät erfolgreich ausgeliehen')
    // Reset state and navigate back to device list or stay? 
    // Usually stay or clear selection. Let's clear selection.
    setBorrowerName('')
    navigate({ to: '/' })
  }, [navigate])

  const handleError = useCallback((error: Error) => {
    toast.error('Ausleihe fehlgeschlagen', {
      description: getUserFriendlyErrorMessage(error),
    })
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Gerät ausleihen</h1>
        <p className="text-muted-foreground">
          Wählen Sie ein Gerät und geben Sie den Namen des Empfängers ein.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Gerät wählen</h2>
        <DeviceSelector
          selectedDeviceId={selectedDeviceId}
          onSelect={handleDeviceSelect}
        />
      </section>

      <section className="space-y-4 max-w-md">
        <h2 className="text-lg font-semibold">2. Empfänger angeben</h2>
        <BorrowerInput
          value={borrowerName}
          onChange={setBorrowerName}
          disabled={!selectedDeviceId}
          autoFocus={false}
        />
      </section>

      <div className="pt-4 border-t">
        <ConfirmLoanButton
          deviceId={selectedDeviceId}
          borrowerName={borrowerName}
          onSuccess={handleSuccess}
          onError={handleError}
          className="w-full sm:w-auto min-w-[200px]"
        />
      </div>
    </div>
  )
}
