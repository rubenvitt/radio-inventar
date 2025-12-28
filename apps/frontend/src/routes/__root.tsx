import { createRootRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/features/Navigation'
import { queryClient } from '@/lib/queryClient'
import { checkSetupStatus } from '@/api/setup'
import { setupKeys } from '@/lib/queryKeys'

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

// Root component that conditionally shows navigation
function RootComponent() {
  const location = useLocation()
  const isSetupPage = location.pathname === '/setup'

  return (
    <ThemeProvider defaultTheme="dark" storageKey="radio-inventar-theme">
      <div className="min-h-screen bg-background text-foreground">
        <main className={isSetupPage ? '' : 'pb-20'}>
          <Outlet />
        </main>
        {/* Hide navigation on setup page */}
        {!isSetupPage && <Navigation />}
      </div>
    </ThemeProvider>
  )
}

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Skip setup check if already on setup page
    if (location.pathname === '/setup') {
      return
    }

    // Check if first-time setup is complete
    const status = await queryClient.ensureQueryData({
      queryKey: setupKeys.status(),
      queryFn: checkSetupStatus,
      staleTime: Infinity,
    })

    // If setup not complete, redirect to setup page
    if (!status.isSetupComplete) {
      throw redirect({ to: '/setup' })
    }
  },
  component: RootComponent,
  errorComponent: RootErrorComponent,
})
