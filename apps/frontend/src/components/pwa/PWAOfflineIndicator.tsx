import { WifiOff } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

export function PWAOfflineIndicator() {
  const { isOffline } = usePWA()

  if (!isOffline) {
    return null
  }

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 py-1.5 px-4 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>Offline - Einige Funktionen sind eingeschränkt</span>
      </div>
    </div>
  )
}
