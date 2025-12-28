// apps/frontend/src/api/auth.ts
// Story 5.2: Admin Login UI - Auth API Functions
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  SessionDataSchema,
  LogoutResponseSchema,
  AUTH_ERROR_MESSAGES,
  ADMIN_FIELD_LIMITS
} from '@radio-inventar/shared';
import { z } from 'zod';
import { apiClient, ApiError, TimeoutError } from './client';
import { authKeys } from '@/lib/queryKeys';

/** Response type for login endpoint */
interface LoginResponse {
  username: string;
  isValid: boolean;
}

/** Response type for logout endpoint */
interface LogoutResponse {
  message: string;
}

/**
 * Maps API errors to user-friendly German messages (AC4, AC5, AC10)
 * @returns Appropriate error message based on error type
 */
function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
      case 429:
        return AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
      default:
        // 5xx server errors and other network issues
        if (error.status >= 500) {
          return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
        }
        // 4xx client errors (except 401/429) - treat as network error for security
        return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
    }
  }
  if (error instanceof TimeoutError) {
    return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
  }
  // Network failures, fetch errors
  return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
}

/**
 * Checks if error is a rate limit response (429)
 * Used to trigger 60s button disable (AC5)
 */
export function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

/** Validation schema for login input to prevent oversized requests */
const LoginInputSchema = z.object({
  username: z.string().min(1).max(ADMIN_FIELD_LIMITS.USERNAME_MAX),
  password: z.string().min(1).max(ADMIN_FIELD_LIMITS.PASSWORD_MAX),
});

/**
 * Login with username and password
 * POST /api/admin/auth/login
 * AC3: Successful login, AC4: Invalid credentials, AC5: Rate limiting
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  // Validate inputs before sending to API
  const inputValidation = LoginInputSchema.safeParse({ username, password });
  if (!inputValidation.success) {
    throw new Error('Invalid username or password format');
  }

  try {
    const response = await apiClient.post<unknown>('/api/admin/auth/login', {
      username,
      password,
    });

    // Validate response with Zod (security requirement)
    // Backend wraps response in { data: ... } via global intercepter
    // We need to validate the inner data object
    const validated = SessionDataSchema.safeParse((response as any).data);
    if (!validated.success) {
      throw new Error('Invalid login response format');
    }

    return validated.data;
  } catch (error) {
    // Re-throw ApiError with appropriate message
    if (error instanceof ApiError) {
      const message = getAuthErrorMessage(error);
      throw new ApiError(error.status, error.statusText, message);
    }
    // Handle network/timeout errors and validation errors
    throw new Error(getAuthErrorMessage(error));
  }
}

/**
 * Check current session status
 * GET /api/admin/auth/session
 * AC8: Session persistence check
 */
export async function checkSession(): Promise<LoginResponse | null> {
  try {
    const response = await apiClient.get<unknown>('/api/admin/auth/session');

    // Validate response with Zod
    // Backend wraps response in { data: ... } via global intercepter
    const validated = SessionDataSchema.safeParse((response as any).data);
    if (!validated.success) {
      return null;
    }

    return validated.data;
  } catch (error) {
    // 401 = not authenticated (expected when not logged in)
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    // For other errors, return null to avoid breaking the app
    return null;
  }
}

/**
 * Logout current session
 * POST /api/admin/auth/logout
 * AC8: Session logout with redirect
 */
export async function logout(): Promise<LogoutResponse> {
  try {
    const response = await apiClient.post<unknown>('/api/admin/auth/logout');

    // Validate response with Zod (security requirement)
    const validated = LogoutResponseSchema.safeParse((response as any).data);
    if (!validated.success) {
      throw new Error('Invalid logout response format');
    }

    return validated.data;
  } catch (error) {
    // Even if logout fails, clear local state
    throw new Error(getAuthErrorMessage(error));
  }
}

// === React Query Hooks (Task 3) ===

/**
 * Hook for login mutation
 * AC3: Successful login, AC7: Loading state
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return login(credentials.username, credentials.password);
    },
    onSuccess: (data) => {
      // Set session data directly in cache for immediate availability
      // This ensures route guards see the new session immediately
      queryClient.setQueryData(authKeys.session(), data);
    },
    retry: false, // No retries on auth mutations
  });
}

/**
 * Hook for session state management
 * AC8: Session persistence - called on mount, no polling
 */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: checkSession,
    staleTime: 5 * 60 * 1000, // 5 minutes - session doesn't change often
    retry: false, // Don't retry on auth failures
  });
}

/**
 * Hook for logout mutation
 * AC8: Logout with redirect to /admin/login
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear session from cache
      queryClient.setQueryData(authKeys.session(), null);
      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      // Redirect to login after successful logout
      navigate({ to: '/admin/login' });
    },
    onError: () => {
      // Even on error, redirect to login to clear UI state
      navigate({ to: '/admin/login' });
    },
    retry: false,
  });
}
