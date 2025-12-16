import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/loan')({
  component: LoanPage,
})

function LoanPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Ausleihen</h1>
      <p className="text-muted-foreground">Geräte-Ausleihe wird in Story 3.2 implementiert</p>
    </div>
  )
}
