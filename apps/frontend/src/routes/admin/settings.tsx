// apps/frontend/src/routes/admin/settings.tsx
// Admin Settings Page - Change Username and Password
import { createFileRoute } from '@tanstack/react-router';
import { CredentialsChangeForm } from '@/components/features/admin/CredentialsChangeForm';

/**
 * Admin settings route (protected).
 * Allows admin to change username and password.
 */
export const Route = createFileRoute('/admin/settings')({
  component: Component,
});

export function Component() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Einstellungen</h1>

      <div className="max-w-md">
        <CredentialsChangeForm />
      </div>
    </div>
  );
}
