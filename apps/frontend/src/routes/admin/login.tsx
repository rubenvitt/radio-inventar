import { createFileRoute, redirect } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';
import { checkSession } from '@/api/auth';
import { authKeys } from '@/lib/queryKeys';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export const Route = createFileRoute('/admin/login')({
  beforeLoad: async () => {
    const session = await queryClient.ensureQueryData({
      queryKey: authKeys.session(),
      queryFn: checkSession,
      staleTime: 30_000,
    });

    if (session?.isValid === true) {
      throw redirect({ to: '/admin' });
    }
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const loginUrl = `${API_BASE_URL}/admin/auth/pocketid/login?returnTo=${encodeURIComponent('/admin')}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Die Anmeldung erfolgt über Pocket ID.
          </p>
          <Button asChild className="w-full" size="lg">
            <a href={loginUrl}>Mit Pocket ID anmelden</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
