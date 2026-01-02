import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isUpdateAvailable: boolean
  isOffline: boolean
}

interface PWAActions {
  promptInstall: () => Promise<boolean>
  updateServiceWorker: () => Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
  })

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone

    if (isStandalone || isIOSStandalone) {
      setState(prev => ({ ...prev, isInstalled: true }))
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setState(prev => ({ ...prev, isInstallable: true }))
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      deferredPrompt = null
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true
      }))
    }

    // Listen for online/offline status
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }))
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }))

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Register service worker manually
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          setRegistration(reg)

          // Check for updates periodically
          const checkForUpdates = () => {
            reg.update().catch(() => {
              // Silently fail if offline
            })
          }

          // Check every 60 seconds when online
          const interval = setInterval(() => {
            if (navigator.onLine) {
              checkForUpdates()
            }
          }, 60000)

          // Listen for new service worker
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }))
                }
              })
            }
          })

          // Cleanup interval on unmount
          return () => clearInterval(interval)
        })
        .catch((error) => {
          console.warn('Service worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      deferredPrompt = null
      setState(prev => ({ ...prev, isInstallable: false }))
      return true
    }

    return false
  }, [])

  const updateServiceWorker = useCallback(async () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })

      // Reload the page once the new service worker takes over
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [registration])

  return {
    ...state,
    promptInstall,
    updateServiceWorker,
  }
}
