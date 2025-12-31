// apps/frontend/src/components/features/admin/CredentialsChangeForm.tsx
// Form component for changing admin credentials (username and/or password)
import { useState } from 'react';
import { z } from 'zod';
import { ADMIN_FIELD_LIMITS, AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import { useChangeCredentials, isRateLimitError } from '@/api/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

/**
 * Form validation schema
 * At least one of newUsername or newPassword must be provided
 */
const CredentialsFormSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Aktuelles Passwort ist erforderlich'),
  newUsername: z
    .string()
    .transform(val => val.trim())
    .pipe(
      z.string()
        .min(ADMIN_FIELD_LIMITS.USERNAME_MIN, `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben`)
        .max(ADMIN_FIELD_LIMITS.USERNAME_MAX, `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben`)
    )
    .optional()
    .or(z.literal('')),
  newPassword: z
    .string()
    .min(ADMIN_FIELD_LIMITS.PASSWORD_MIN, `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben`)
    .max(ADMIN_FIELD_LIMITS.PASSWORD_MAX, `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben`)
    .optional()
    .or(z.literal('')),
  confirmPassword: z
    .string()
    .optional()
    .or(z.literal('')),
}).refine(data => {
  // At least one change must be provided
  const hasNewUsername = data.newUsername && data.newUsername.trim().length >= ADMIN_FIELD_LIMITS.USERNAME_MIN;
  const hasNewPassword = data.newPassword && data.newPassword.length >= ADMIN_FIELD_LIMITS.PASSWORD_MIN;
  return hasNewUsername || hasNewPassword;
}, {
  message: AUTH_ERROR_MESSAGES.NO_CHANGES,
  path: ['newUsername'], // Show error on first change field
}).refine(data => {
  // If new password is provided, confirm must match
  if (data.newPassword && data.newPassword.length >= ADMIN_FIELD_LIMITS.PASSWORD_MIN) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

interface FieldErrors {
  currentPassword?: string;
  newUsername?: string;
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * CredentialsChangeForm - Form to change admin username and/or password.
 *
 * Features:
 * - Current password verification
 * - Optional new username
 * - Optional new password with confirmation
 * - Client-side validation
 * - Error handling for various API responses
 * - Success feedback
 */
export function CredentialsChangeForm() {
  const changeCredentialsMutation = useChangeCredentials();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitDisabled = changeCredentialsMutation.isPending;

  const resetForm = () => {
    setCurrentPassword('');
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setApiError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous state
    setFieldErrors({});
    setApiError(null);
    setSuccessMessage(null);

    // Validate input
    const validation = CredentialsFormSchema.safeParse({
      currentPassword,
      newUsername: newUsername || undefined,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
    });

    if (!validation.success) {
      const errors: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    // Prepare request data
    const requestData: { currentPassword: string; newUsername?: string; newPassword?: string } = {
      currentPassword,
    };

    if (newUsername && newUsername.trim().length >= ADMIN_FIELD_LIMITS.USERNAME_MIN) {
      requestData.newUsername = newUsername.trim().toLowerCase();
    }

    if (newPassword && newPassword.length >= ADMIN_FIELD_LIMITS.PASSWORD_MIN) {
      requestData.newPassword = newPassword;
    }

    // Submit to API
    changeCredentialsMutation.mutate(requestData, {
      onSuccess: (data) => {
        setSuccessMessage(data.message);
        resetForm();
      },
      onError: (error) => {
        if (isRateLimitError(error)) {
          setApiError(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS);
          return;
        }
        setApiError(error.message);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zugangsdaten ändern</CardTitle>
        <CardDescription>
          Ändern Sie Ihren Benutzernamen und/oder Ihr Passwort
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div
              role="status"
              className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          {/* Current Password - Required */}
          <div className="space-y-2">
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium"
            >
              Aktuelles Passwort *
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.currentPassword}
              aria-describedby={fieldErrors.currentPassword ? 'currentPassword-error' : undefined}
              autoComplete="current-password"
              className={cn(fieldErrors.currentPassword && 'border-destructive')}
            />
            {fieldErrors.currentPassword && (
              <p id="currentPassword-error" className="text-sm text-destructive">
                {fieldErrors.currentPassword}
              </p>
            )}
          </div>

          <hr className="my-4" />

          {/* New Username - Optional */}
          <div className="space-y-2">
            <label
              htmlFor="newUsername"
              className="block text-sm font-medium"
            >
              Neuer Benutzername
            </label>
            <Input
              id="newUsername"
              type="text"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                if (fieldErrors.newUsername) {
                  setFieldErrors((prev) => ({ ...prev, newUsername: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.USERNAME_MAX}
              aria-invalid={!!fieldErrors.newUsername}
              aria-describedby={fieldErrors.newUsername ? 'newUsername-error' : 'newUsername-hint'}
              autoComplete="username"
              placeholder="Leer lassen, um nicht zu ändern"
              className={cn(fieldErrors.newUsername && 'border-destructive')}
            />
            <p id="newUsername-hint" className="text-xs text-muted-foreground">
              {ADMIN_FIELD_LIMITS.USERNAME_MIN}-{ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen
            </p>
            {fieldErrors.newUsername && (
              <p id="newUsername-error" className="text-sm text-destructive">
                {fieldErrors.newUsername}
              </p>
            )}
          </div>

          {/* New Password - Optional */}
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium"
            >
              Neues Passwort
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              disabled={isSubmitDisabled}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.newPassword}
              aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : 'newPassword-hint'}
              autoComplete="new-password"
              placeholder="Leer lassen, um nicht zu ändern"
              className={cn(fieldErrors.newPassword && 'border-destructive')}
            />
            <p id="newPassword-hint" className="text-xs text-muted-foreground">
              {ADMIN_FIELD_LIMITS.PASSWORD_MIN}-{ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen
            </p>
            {fieldErrors.newPassword && (
              <p id="newPassword-error" className="text-sm text-destructive">
                {fieldErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium"
            >
              Neues Passwort bestätigen
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
              disabled={isSubmitDisabled || !newPassword}
              maxLength={ADMIN_FIELD_LIMITS.PASSWORD_MAX}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              autoComplete="new-password"
              placeholder={newPassword ? 'Passwort wiederholen' : 'Erst neues Passwort eingeben'}
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
            aria-busy={changeCredentialsMutation.isPending}
            className="w-full"
            size="lg"
          >
            {changeCredentialsMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span
                  className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Speichern...
              </span>
            ) : (
              'Änderungen speichern'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
