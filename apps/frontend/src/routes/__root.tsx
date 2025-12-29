import { createRootRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/features/Navigation'
import { queryClient } from '@/lib/queryClient'
import { checkSetupStatus } from '@/api/setup'
import { setupKeys } from '@/lib/queryKeys'
import { tokenStorage } from '@/lib/tokenStorage'

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
  const isTokenSetupPage = location.pathname === '/token-setup'
  const hideNavigation = isSetupPage || isTokenSetupPage

  return (
    <ThemeProvider defaultTheme="dark" storageKey="radio-inventar-theme">
      <div className="min-h-screen bg-background text-foreground">
        <main className={hideNavigation ? '' : 'pb-20'}>
          <Outlet />
        </main>
        {/* Hide navigation on setup and token-setup pages */}
        {!hideNavigation && <Navigation />}
      </div>
    </ThemeProvider>
  )
}

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Check for token in URL parameter and save it (base64-encoded)
    const urlParams = new URLSearchParams(location.search)
    const encodedTokenFromUrl = urlParams.get('token')

    if (encodedTokenFromUrl) {
      try {
        // Decode base64-encoded token from URL
        const tokenFromUrl = atob(encodedTokenFromUrl)
        if (tokenFromUrl.length >= 32) {
          tokenStorage.set(tokenFromUrl)
        }
      } catch {
        // Invalid base64, ignore the token parameter
      }
      // Remove token from URL for security (prevent it showing in browser history)
      urlParams.delete('token')
      const cleanSearch = urlParams.toString()
      const cleanUrl = location.pathname + (cleanSearch ? `?${cleanSearch}` : '')
      // Use replaceState to update URL without adding to history
      window.history.replaceState({}, '', cleanUrl)
    }

    // Skip token check for token-setup page
    if (location.pathname === '/token-setup') {
      return
    }

    // Check if API token exists in localStorage
    if (!tokenStorage.exists()) {
      throw redirect({ to: '/token-setup' })
    }

    // Skip setup check if already on setup page
    if (location.pathname === '/setup') {
      return
    }

    // Check if first-time setup is complete
    // On any error, checkSetupStatus returns isSetupComplete: false (secure default)
    const status = await queryClient.ensureQueryData({
      queryKey: setupKeys.status(),
      queryFn: checkSetupStatus,
      staleTime: Infinity,
    }).catch(() => {
      // On query error, assume setup is not complete
      return { isSetupComplete: false }
    })

    // If setup not complete, redirect to setup page
    if (!status.isSetupComplete) {
      throw redirect({ to: '/setup' })
    }
  },
  component: RootComponent,
  errorComponent: RootErrorComponent,
})
