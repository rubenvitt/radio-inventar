import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Übersicht</h1>
      <p className="text-muted-foreground">Geräte-Status wird in Story 2.2 implementiert</p>
    </div>
  )
}
