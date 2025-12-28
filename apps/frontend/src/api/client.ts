const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Default timeout for API requests in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      response.statusText,
      errorText || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  throw new Error('Expected JSON response from API');
}

/**
 * Creates an AbortController with automatic timeout.
 * Returns the signal and a cleanup function.
 */
function createTimeoutController(timeoutMs: number = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
  timeoutMs: number;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
    timeoutMs,
  };
}

/**
 * Wraps fetch with timeout handling.
 * Throws TimeoutError if request exceeds timeout.
 */
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit,
  timeoutMs?: number,
): Promise<T> {
  const { signal, cleanup, timeoutMs: actualTimeout } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal,
      credentials: 'include', // Required for session cookies (AC8)
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(actualTimeout);
    }
    throw error;
  } finally {
    cleanup();
  }
}

export const apiClient = {
  get: async <T>(endpoint: string, timeoutMs?: number): Promise<T> => {
    return fetchWithTimeout<T>(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      timeoutMs,
    );
  },

  post: async <T, D = unknown>(endpoint: string, data?: D, timeoutMs?: number): Promise<T> => {
    return fetchWithTimeout<T>(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(data && { body: JSON.stringify(data) }),
      },
      timeoutMs,
    );
  },

  put: async <T, D = unknown>(endpoint: string, data?: D, timeoutMs?: number): Promise<T> => {
    return fetchWithTimeout<T>(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(data && { body: JSON.stringify(data) }),
      },
      timeoutMs,
    );
  },

  patch: async <T, D = unknown>(endpoint: string, data?: D, timeoutMs?: number): Promise<T> => {
    return fetchWithTimeout<T>(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(data && { body: JSON.stringify(data) }),
      },
      timeoutMs,
    );
  },

  delete: async <T>(endpoint: string, timeoutMs?: number): Promise<T> => {
    return fetchWithTimeout<T>(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      timeoutMs,
    );
  },
};
