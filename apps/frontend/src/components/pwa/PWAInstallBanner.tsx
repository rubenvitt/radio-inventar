import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/usePWA'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    if (!isInstallable || isInstalled) {
      setIsVisible(false)
      return
    }

    // Check if user dismissed the banner recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return
      }
      localStorage.removeItem(DISMISS_KEY)
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await promptInstall()
    } finally {
      setIsInstalling(false)
      setIsVisible(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom duration-300"
      role="banner"
      aria-label="App installieren"
    >
      <div className="bg-card border-t border-border shadow-lg p-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">
              App installieren
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Installiere Radio Inventar auf deinem Gerät für schnelleren Zugriff und Offline-Nutzung.
            </p>

            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isInstalling ? 'Wird installiert...' : 'Installieren'}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                Später
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
