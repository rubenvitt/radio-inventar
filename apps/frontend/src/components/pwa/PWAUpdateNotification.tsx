import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/usePWA'

export function PWAUpdateNotification() {
  const { isUpdateAvailable, updateServiceWorker } = usePWA()

  if (!isUpdateAvailable) {
    return null
  }

  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-lg mx-auto bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium">
              Update verfügbar
            </p>
            <p className="text-sm opacity-90">
              Eine neue Version ist bereit.
            </p>
          </div>

          <Button
            onClick={updateServiceWorker}
            variant="secondary"
            size="sm"
            className="flex-shrink-0"
          >
            Aktualisieren
          </Button>
        </div>
      </div>
    </div>
  )
}
