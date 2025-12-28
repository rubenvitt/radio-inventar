// apps/frontend/src/routes/setup.tsx
// First-time setup route for creating the initial admin user
import { createFileRoute, redirect } from '@tanstack/react-router';
import { SetupForm } from '@/components/features/SetupForm';
import { queryClient } from '@/lib/queryClient';
import { checkSetupStatus } from '@/api/setup';
import { setupKeys } from '@/lib/queryKeys';

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    // Check if setup is already complete
    const status = await queryClient.ensureQueryData({
      queryKey: setupKeys.status(),
      queryFn: checkSetupStatus,
      staleTime: Infinity,
    });

    // If setup is complete, redirect to home
    if (status.isSetupComplete) {
      throw redirect({ to: '/' });
    }
  },
  component: SetupPage,
});

function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <SetupForm />
    </div>
  );
}
