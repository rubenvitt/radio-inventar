// apps/frontend/src/components/features/AdminLoginForm.tsx
// Story 5.2: Admin Login UI - Login Form Component
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ADMIN_FIELD_LIMITS, AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import { useLogin, isRateLimitError } from '@/api/auth';
import { authKeys } from '@/lib/queryKeys';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Rate limit timeout in milliseconds (AC5: 60 seconds) */
const RATE_LIMIT_TIMEOUT_MS = 60_000;

/**
 * Form validation schema using shared field limits (AC9)
 *
 * Note: Password is intentionally NOT trimmed in the schema. Passwords may
 * legitimately contain leading or trailing whitespace as part of the user's
 * chosen password. Only username is trimmed as it's an identifier.
 */
const LoginFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(ADMIN_FIELD_LIMITS.USERNAME_MIN, `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben`)
    .max(ADMIN_FIELD_LIMITS.USERNAME_MAX, `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben`),
  password: z
    .string()
    .min(ADMIN_FIELD_LIMITS.PASSWORD_MIN, `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben`)
    .max(ADMIN_FIELD_LIMITS.PASSWORD_MAX, `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben`),
});

interface FieldErrors {
  username?: string | undefined;
  password?: string | undefined;
}

/**
 * AdminLoginForm - Login form for admin authentication.
 *
 * Features:
 * - Username/password inputs (AC2)
 * - Client-side Zod validation (AC9)
 * - Loading state during mutation (AC7)
 * - Error display for 401, 429, 5xx (AC4, AC5, AC10)
 * - 44px minimum touch targets (AC6, NFR11)
 * - 60s button disable on rate limit (AC5)
 * - Redirect to /admin on success (AC3)
 */
export function AdminLoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Check if button should be disabled due to rate limiting (AC5)
  const isRateLimited = rateLimitUntil !== null && Date.now() < rateLimitUntil;
  const isSubmitDisabled = loginMutation.isPending || isRateLimited;

  // Handle countdown timer and cleanup (CRITICAL 1 & HIGH 5 fixes)
  useEffect(() => {
    if (rateLimitUntil === null) {
      setRemainingSeconds(0);
      return;
    }

    // Calculate initial remaining seconds
    const remaining = rateLimitUntil - Date.now();
    if (remaining <= 0) {
      setRateLimitUntil(null);
      setRemainingSeconds(0);
      return;
    }

    setRemainingSeconds(Math.ceil(remaining / 1000));

    // Update countdown every second
    const interval = setInterval(() => {
      const newRemaining = rateLimitUntil - Date.now();
      if (newRemaining <= 0) {
        setRateLimitUntil(null);
        setRemainingSeconds(0);
        clearInterval(interval);
      } else {
        setRemainingSeconds(Math.ceil(newRemaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitUntil]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});
    setApiError(null);

    // AC9: Validate input before API call
    const validation = LoginFormSchema.safeParse({ username, password });
    if (!validation.success) {
      const errors: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    // Submit to API
    loginMutation.mutate(
      { username: validation.data.username, password: validation.data.password },
      {
        onSuccess: (data) => {
          // Set session data directly in cache to ensure immediate availability
          // This prevents race condition where navigate happens before the
          // invalidation refetch completes
          queryClient.setQueryData(authKeys.session(), data);

          // AC3: Redirect to admin dashboard on success
          navigate({ to: '/admin' });
        },
        onError: (error) => {
          // AC5: Handle rate limiting with 60s button disable
          if (isRateLimitError(error)) {
            setRateLimitUntil(Date.now() + RATE_LIMIT_TIMEOUT_MS);
            setApiError(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS);
            return;
          }

          // AC4, AC10: Display error message
          setApiError(error.message);
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Admin Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input - AC2, AC6 */}
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium"
            >
              Benutzername
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                // Clear field error when user starts typing
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.USERNAME_MAX}
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              autoComplete="username"
              autoFocus
              className={cn(
                fieldErrors.username && 'border-destructive'
              )}
            />
            {fieldErrors.username && (
              <p id="username-error" className="text-sm text-destructive">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Password Input - AC2, AC6 */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
            >
              Passwort
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Clear field error when user starts typing
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              autoComplete="current-password"
              className={cn(
                fieldErrors.password && 'border-destructive'
              )}
            />
            {fieldErrors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* API Error Display - AC4, AC5, AC10 */}
          {apiError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {apiError}
              {isRateLimited && (
                <span className="block mt-1 text-muted-foreground">
                  Bitte warten Sie noch {remainingSeconds} Sekunden.
                </span>
              )}
            </div>
          )}

          {/* Submit Button - AC6, AC7 */}
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            aria-busy={loginMutation.isPending}
            className={cn(
              'w-full',
              'text-lg font-medium'
            )}
            size="lg"
          >
            {loginMutation.isPending ? (
              <span className="flex items-center gap-2">
                {/* AC7: Loading indicator */}
                <span
                  className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Anmelden...
              </span>
            ) : isRateLimited ? (
              `Gesperrt (${remainingSeconds}s)`
            ) : (
              'Anmelden'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
