import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/features/Navigation'

// Error Fallback für Route-Fehler
function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Fehler</h1>
        <p className="text-muted-foreground mb-4">
          {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Seite neu laden
        </button>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="radio-inventar-theme">
      <div className="min-h-screen bg-background text-foreground">
        <main className="pb-20">
          <Outlet />
        </main>
        <Navigation />
      </div>
    </ThemeProvider>
  ),
  errorComponent: RootErrorComponent,
})
