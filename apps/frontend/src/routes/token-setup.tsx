import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { tokenStorage } from '@/lib/tokenStorage';
import { useVerifyToken } from '@/api/token';
import { API_TOKEN_CONFIG } from '@radio-inventar/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ApiError } from '@/api/client';

export const Route = createFileRoute('/token-setup')({
  beforeLoad: () => {
    // If token already exists, redirect to home
    if (tokenStorage.exists()) {
      throw redirect({ to: '/' });
    }
  },
  component: TokenSetupPage,
});

function TokenSetupPage() {
  const [token, setToken] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const navigate = useNavigate();
  const verifyMutation = useVerifyToken();

  const isSubmitDisabled = verifyMutation.isPending || token.length < API_TOKEN_CONFIG.MIN_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    // Client-side validation
    if (token.length < API_TOKEN_CONFIG.MIN_LENGTH) {
      setFieldError(`Token muss mindestens ${API_TOKEN_CONFIG.MIN_LENGTH} Zeichen haben`);
      return;
    }

    verifyMutation.mutate(token, {
      onSuccess: () => {
        navigate({ to: '/' });
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          setFieldError(error.message);
        } else {
          setFieldError('Ungültiger Token');
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">API-Token eingeben</CardTitle>
          <CardDescription>
            Bitte geben Sie den API-Token ein, um auf die Anwendung zuzugreifen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Input */}
            <div className="space-y-2">
              <label htmlFor="token" className="block text-sm font-medium">
                API-Token
              </label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (fieldError) {
                    setFieldError(null);
                  }
                }}
                disabled={verifyMutation.isPending}
                placeholder="Token eingeben..."
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'token-error' : 'token-hint'}
                autoComplete="off"
                autoFocus
                className={cn(fieldError && 'border-destructive')}
              />
              {fieldError ? (
                <p id="token-error" className="text-sm text-destructive">
                  {fieldError}
                </p>
              ) : (
                <p id="token-hint" className="text-sm text-muted-foreground">
                  Den API-Token finden Sie in der Serverkonfiguration (.env Datei).
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              aria-busy={verifyMutation.isPending}
              className={cn('w-full', 'text-lg font-medium')}
              size="lg"
            >
              {verifyMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span
                    className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                  Wird überprüft...
                </span>
              ) : (
                'Token überprüfen'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
