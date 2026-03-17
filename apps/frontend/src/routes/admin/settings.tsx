// apps/frontend/src/routes/admin/settings.tsx
// Admin Settings Page - Change Username and Password
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CredentialsChangeForm } from '@/components/features/admin/CredentialsChangeForm';
import { useAdminAuthConfig } from '@/api/auth';

/**
 * Admin settings route (protected).
 * Allows admin to change username and password.
 */
export const Route = createFileRoute('/admin/settings')({
  component: Component,
});

export function Component() {
  const authConfigQuery = useAdminAuthConfig();

  if (authConfigQuery.isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Einstellungen werden geladen</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Einstellungen</h1>

      <div className="max-w-md">
        {authConfigQuery.data?.changeCredentialsEnabled === false ? (
          <Card>
            <CardHeader>
              <CardTitle>Pocket ID verwaltet den Login</CardTitle>
              <CardDescription>
                Benutzername und Passwort werden nicht lokal gespeichert.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Änderungen an Zugangsdaten oder Gruppen erfolgen direkt in Pocket ID.
            </CardContent>
          </Card>
        ) : (
          <CredentialsChangeForm />
        )}
      </div>
    </div>
  );
}
