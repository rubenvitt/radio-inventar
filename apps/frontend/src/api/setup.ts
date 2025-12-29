// apps/frontend/src/api/setup.ts
// First-time setup API functions
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  SetupStatusSchema,
  SessionDataSchema,
  SETUP_ERROR_MESSAGES,
  ADMIN_FIELD_LIMITS,
} from '@radio-inventar/shared';
import { z } from 'zod';
import { apiClient, ApiError, TimeoutError } from './client';
import { setupKeys, authKeys } from '@/lib/queryKeys';

/** Response type for setup status endpoint */
interface SetupStatusResponse {
  isSetupComplete: boolean;
}

/** Response type for create admin endpoint (same as login) */
interface SessionResponse {
  username: string;
  isValid: boolean;
}

/**
 * Maps setup API errors to user-friendly German messages
 */
function getSetupErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 403:
        return SETUP_ERROR_MESSAGES.ALREADY_COMPLETE;
      case 409:
        return SETUP_ERROR_MESSAGES.ADMIN_EXISTS;
      case 429:
        return 'Zu viele Versuche. Bitte später erneut versuchen.';
      default:
        if (error.status >= 500) {
          return 'Serverfehler. Bitte später erneut versuchen.';
        }
        return SETUP_ERROR_MESSAGES.CREATION_FAILED;
    }
  }
  if (error instanceof TimeoutError) {
    return 'Zeitüberschreitung. Bitte später erneut versuchen.';
  }
  return SETUP_ERROR_MESSAGES.CREATION_FAILED;
}

/**
 * Check if first-time setup is complete
 * GET /api/setup/status
 *
 * SECURITY: On any error, assume setup is NOT complete and redirect to setup.
 * This prevents bypassing the first-time setup requirement.
 */
export async function checkSetupStatus(): Promise<SetupStatusResponse> {
  const response = await apiClient.get<unknown>('/api/setup/status');

  // Backend wraps response in { data: ... } via global interceptor
  const validated = SetupStatusSchema.safeParse((response as any).data);
  if (!validated.success) {
    // If validation fails, assume setup is incomplete (safer default)
    console.error('Invalid setup status response:', validated.error?.message ?? 'Unknown validation error');
    return { isSetupComplete: false };
  }

  return validated.data;
}

/** Validation schema for admin creation input */
const CreateAdminInputSchema = z.object({
  username: z.string().min(1).max(ADMIN_FIELD_LIMITS.USERNAME_MAX),
  password: z.string().min(1).max(ADMIN_FIELD_LIMITS.PASSWORD_MAX),
});

/**
 * Create the first admin user
 * POST /api/setup
 */
export async function createFirstAdmin(
  username: string,
  password: string
): Promise<SessionResponse> {
  // Validate inputs before sending to API
  const inputValidation = CreateAdminInputSchema.safeParse({ username, password });
  if (!inputValidation.success) {
    throw new Error('Invalid username or password format');
  }

  try {
    const response = await apiClient.post<unknown>('/api/setup', {
      username,
      password,
    });

    // Validate response with Zod
    const validated = SessionDataSchema.safeParse((response as any).data);
    if (!validated.success) {
      throw new Error('Invalid setup response format');
    }

    return validated.data;
  } catch (error) {
    if (error instanceof ApiError) {
      const message = getSetupErrorMessage(error);
      throw new ApiError(error.status, error.statusText, message);
    }
    throw new Error(getSetupErrorMessage(error));
  }
}

// === React Query Hooks ===

/**
 * Hook for checking setup status
 * Uses Infinity staleTime since setup status doesn't change during a session
 */
export function useSetupStatus() {
  return useQuery({
    queryKey: setupKeys.status(),
    queryFn: checkSetupStatus,
    staleTime: Infinity, // Setup status doesn't change during session
    retry: 2,
  });
}

/**
 * Hook for creating the first admin
 * On success, updates both setup status and session caches
 */
export function useCreateFirstAdmin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return createFirstAdmin(credentials.username, credentials.password);
    },
    onSuccess: (data) => {
      // Update setup status cache
      queryClient.setQueryData(setupKeys.status(), { isSetupComplete: true });
      // Set session data (auto-login)
      queryClient.setQueryData(authKeys.session(), data);
      // Redirect to home page
      navigate({ to: '/' });
    },
    retry: false,
  });
}
