// apps/frontend/src/components/features/SetupForm.tsx
// First-time setup form for creating the initial admin user
import { useState } from 'react';
import { z } from 'zod';
import { ADMIN_FIELD_LIMITS } from '@radio-inventar/shared';
import { useCreateFirstAdmin } from '@/api/setup';
import { ApiError } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Form validation schema using shared field limits
 */
const SetupFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(
      ADMIN_FIELD_LIMITS.USERNAME_MIN,
      `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben`
    )
    .max(
      ADMIN_FIELD_LIMITS.USERNAME_MAX,
      `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben`
    ),
  password: z
    .string()
    .min(
      ADMIN_FIELD_LIMITS.PASSWORD_MIN,
      `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben`
    )
    .max(
      ADMIN_FIELD_LIMITS.PASSWORD_MAX,
      `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben`
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

interface FieldErrors {
  username?: string | undefined;
  password?: string | undefined;
  confirmPassword?: string | undefined;
}

/**
 * SetupForm - Initial setup form for creating the first admin user.
 *
 * Features:
 * - Username/password/confirm-password inputs
 * - Client-side Zod validation
 * - Loading state during mutation
 * - Error display
 * - 44px minimum touch targets
 * - Auto-login and redirect on success
 */
export function SetupForm() {
  const createAdminMutation = useCreateFirstAdmin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const isSubmitDisabled = createAdminMutation.isPending;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});
    setApiError(null);

    // Validate input before API call
    const validation = SetupFormSchema.safeParse({ username, password, confirmPassword });
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
    createAdminMutation.mutate(
      { username: validation.data.username, password: validation.data.password },
      {
        onError: (error) => {
          if (error instanceof ApiError) {
            setApiError(error.message);
          } else {
            setApiError(error.message || 'Ein Fehler ist aufgetreten');
          }
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Ersteinrichtung</CardTitle>
        <CardDescription>
          Erstellen Sie das erste Admin-Konto, um die Anwendung zu nutzen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              Benutzername
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
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
              className={cn(fieldErrors.username && 'border-destructive')}
            />
            {fieldErrors.username && (
              <p id="username-error" className="text-sm text-destructive">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Passwort
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              autoComplete="new-password"
              className={cn(fieldErrors.password && 'border-destructive')}
            />
            {fieldErrors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Passwort bestätigen
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              autoComplete="new-password"
              className={cn(fieldErrors.confirmPassword && 'border-destructive')}
            />
            {fieldErrors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* API Error Display */}
          {apiError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {apiError}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            aria-busy={createAdminMutation.isPending}
            className={cn('w-full', 'text-lg font-medium')}
            size="lg"
          >
            {createAdminMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span
                  className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Erstelle Admin...
              </span>
            ) : (
              'Admin erstellen'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
