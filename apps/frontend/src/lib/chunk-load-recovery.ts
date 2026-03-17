const CHUNK_LOAD_RETRY_KEY = 'radio-inventar:chunk-load-retry-at'
const CHUNK_LOAD_RETRY_COOLDOWN_MS = 10_000
const CHUNK_LOAD_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
]

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

interface ChunkLoadRecoveryOptions {
  isOnline?: () => boolean
  now?: () => number
  reload?: () => void
  storage?: StorageLike
}

interface ChunkLoadErrorEvent extends Event {
  error?: unknown
  message?: string
  payload?: unknown
  reason?: unknown
}

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }

    if ('error' in error) {
      return extractErrorMessage(error.error)
    }

    if ('payload' in error) {
      return extractErrorMessage(error.payload)
    }

    if ('reason' in error) {
      return extractErrorMessage(error.reason)
    }
  }

  return null
}

function shouldReloadForChunkLoadError(storage: StorageLike, now: number): boolean {
  try {
    const lastAttemptRaw = storage.getItem(CHUNK_LOAD_RETRY_KEY)

    if (lastAttemptRaw !== null) {
      const lastAttempt = Number(lastAttemptRaw)

      if (Number.isFinite(lastAttempt) && now - lastAttempt < CHUNK_LOAD_RETRY_COOLDOWN_MS) {
        return false
      }
    }

    storage.setItem(CHUNK_LOAD_RETRY_KEY, String(now))
  } catch {
    // Storage can be unavailable in restrictive browser modes. Reload once anyway.
  }

  return true
}

export function isChunkLoadError(error: unknown): boolean {
  const message = extractErrorMessage(error)

  if (!message) {
    return false
  }

  return CHUNK_LOAD_ERROR_PATTERNS.some(pattern => pattern.test(message))
}

export function recoverFromChunkLoadError(
  error: unknown,
  options: Required<ChunkLoadRecoveryOptions>,
): boolean {
  if (!isChunkLoadError(error) || !options.isOnline()) {
    return false
  }

  if (!shouldReloadForChunkLoadError(options.storage, options.now())) {
    return false
  }

  options.reload()
  return true
}

export function registerChunkLoadErrorRecovery(options: ChunkLoadRecoveryOptions = {}) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const recoveryOptions: Required<ChunkLoadRecoveryOptions> = {
    isOnline: options.isOnline ?? (() => navigator.onLine),
    now: options.now ?? (() => Date.now()),
    reload: options.reload ?? (() => window.location.reload()),
    storage: options.storage ?? window.sessionStorage,
  }

  const attemptRecovery = (error: unknown, preventDefault: () => void) => {
    if (recoverFromChunkLoadError(error, recoveryOptions)) {
      preventDefault()
    }
  }

  const handlePreloadError = (event: Event) => {
    const chunkEvent = event as ChunkLoadErrorEvent
    attemptRecovery(chunkEvent.payload ?? chunkEvent, () => chunkEvent.preventDefault())
  }

  const handleWindowError = (event: Event) => {
    const chunkEvent = event as ChunkLoadErrorEvent
    attemptRecovery(chunkEvent.error ?? chunkEvent, () => chunkEvent.preventDefault())
  }

  const handleUnhandledRejection = (event: Event) => {
    const chunkEvent = event as ChunkLoadErrorEvent
    attemptRecovery(chunkEvent.reason ?? chunkEvent, () => chunkEvent.preventDefault())
  }

  window.addEventListener('vite:preloadError', handlePreloadError as EventListener)
  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    window.removeEventListener('vite:preloadError', handlePreloadError as EventListener)
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
