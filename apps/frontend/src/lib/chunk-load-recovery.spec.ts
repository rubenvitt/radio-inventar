import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isChunkLoadError,
  recoverFromChunkLoadError,
  registerChunkLoadErrorRecovery,
} from './chunk-load-recovery'

function createMemoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

describe('chunk-load-recovery', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('detects stale dynamic import failures', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://radio.iuk-ue.de/assets/devices.js'),
      ),
    ).toBe(true)

    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false)
  })

  it('reloads once for stale chunk errors and prevents a reload loop', () => {
    const reload = vi.fn()
    let currentTime = 1_000
    const storage = createMemoryStorage()
    const options = {
      now: () => currentTime,
      reload,
      storage,
      isOnline: () => true,
    }
    const error = new Error('Failed to fetch dynamically imported module: /assets/devices.js')

    expect(recoverFromChunkLoadError(error, options)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)

    expect(recoverFromChunkLoadError(error, options)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)

    currentTime += 10_001
    expect(recoverFromChunkLoadError(error, options)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('does not reload while offline', () => {
    const reload = vi.fn()
    const storage = createMemoryStorage()
    const cleanup = registerChunkLoadErrorRecovery({
      reload,
      storage,
      isOnline: () => false,
    })

    const event = new Event('error', { cancelable: true }) as Event & { message?: string }
    Object.defineProperty(event, 'message', {
      configurable: true,
      value: 'Failed to fetch dynamically imported module: /assets/devices.js',
    })

    window.dispatchEvent(event)
    expect(reload).not.toHaveBeenCalled()

    cleanup()
  })

  it('prevents the default vite preload error only when recovery succeeds', () => {
    const reload = vi.fn()
    const storage = createMemoryStorage()
    const cleanup = registerChunkLoadErrorRecovery({
      reload,
      storage,
      isOnline: () => true,
    })

    const event = new Event('vite:preloadError', { cancelable: true }) as Event & {
      payload?: unknown
    }
    Object.defineProperty(event, 'payload', {
      configurable: true,
      value: new Error('Failed to fetch dynamically imported module: /assets/devices.js'),
    })

    expect(event.defaultPrevented).toBe(false)
    window.dispatchEvent(event)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)

    cleanup()
  })

  it('reloads on unhandled dynamic import rejections', () => {
    const reload = vi.fn()
    const storage = createMemoryStorage()
    const cleanup = registerChunkLoadErrorRecovery({
      reload,
      storage,
      isOnline: () => true,
    })

    const event = new Event('unhandledrejection', { cancelable: true }) as Event & {
      reason?: unknown
    }
    Object.defineProperty(event, 'reason', {
      configurable: true,
      value: new TypeError('Importing a module script failed.'),
    })

    window.dispatchEvent(event)
    expect(reload).toHaveBeenCalledTimes(1)

    cleanup()
  })
})
