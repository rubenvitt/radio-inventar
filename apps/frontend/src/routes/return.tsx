import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/return')({
  component: ReturnPage,
})

function ReturnPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Zurückgeben</h1>
      <p className="text-muted-foreground">Geräte-Rückgabe wird in Story 4.2 implementiert</p>
    </div>
  )
}
