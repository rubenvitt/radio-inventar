// apps/frontend/src/routes/admin/login.tsx
// Story 5.2: Admin Login UI - Login Page
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminLoginForm } from '@/components/features/AdminLoginForm';
import { queryClient } from '@/lib/queryClient';
import { checkSession } from '@/api/auth';
import { authKeys } from '@/lib/queryKeys';

/**
 * Admin login page (public route).
 *
 * AC2: Displays login form with username/password
 * AC3: Redirects to /admin on successful login (handled by form)
 *
 * This route does NOT require authentication - it's the login page itself.
 * However, it redirects already authenticated users to /admin.
 */
export const Route = createFileRoute('/admin/login')({
  beforeLoad: async () => {
    // Check if already authenticated
    const session = await queryClient.ensureQueryData({
      queryKey: authKeys.session(),
      queryFn: checkSession,
      staleTime: 30_000, // 30 seconds cache
    });

    // If valid session, redirect to admin dashboard
    if (session?.isValid === true) {
      throw redirect({ to: '/admin' });
    }
  },
  component: AdminLoginPage,
});

/**
 * Login page component with centered form.
 */
function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AdminLoginForm />
    </div>
  );
}
