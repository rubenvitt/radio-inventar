import { useMutation } from '@tanstack/react-query';
import { ApiError } from './client';
import { API_TOKEN_ERROR_MESSAGES } from '@radio-inventar/shared';
import { tokenStorage } from '@/lib/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface VerifyTokenResponse {
  data: {
    valid: boolean;
  };
}

/**
 * Verify token WITHOUT using the apiClient (which would add the stored token)
 * This is a special endpoint that accepts the token in the body
 */
export async function verifyToken(token: string): Promise<{ valid: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      response.statusText,
      errorText || API_TOKEN_ERROR_MESSAGES.INVALID_TOKEN,
    );
  }

  const result: VerifyTokenResponse = await response.json();
  return result.data;
}

export function useVerifyToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const result = await verifyToken(token);
      if (result.valid) {
        tokenStorage.set(token);
      }
      return result;
    },
    retry: false,
  });
}
