// apps/frontend/src/routes/admin.tsx
// Story 5.2: Admin Login UI - Auth Guard Route
import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { checkSession } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';
import { authKeys } from '@/lib/queryKeys';
import { AdminNavigation } from '@/components/features/admin/AdminNavigation';

/**
 * Admin layout route with authentication guard.
 *
 * AC1: Redirects to /admin/login if not authenticated
 * AC8: Session persistence check on navigation
 *
 * beforeLoad runs on every navigation to /admin or /admin/*
 * and enforces authentication by checking the session.
 *
 * Uses queryClient.ensureQueryData for request deduplication:
 * - Prevents multiple concurrent session checks
 * - Caches results for 5 seconds (staleTime)
 * - Reuses pending requests if multiple navigations happen simultaneously
 */
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Skip auth check for login page - it's publicly accessible
    // Note: Using pathname instead of location.id because:
    // 1. pathname is more straightforward for this use case
    // 2. TanStack Router's route matching happens after beforeLoad
    // 3. Case-insensitive comparison prevents bypass via /admin/Login
    if (location.pathname.toLowerCase() === '/admin/login') {
      return;
    }

    // AC8: Check session with caching and deduplication
    // ensureQueryData will:
    // 1. Return cached data if fresh (within staleTime)
    // 2. Reuse in-flight request if one is already pending
    // 3. Make new request only if needed
    const session = await queryClient.ensureQueryData({
      queryKey: authKeys.session(),
      queryFn: checkSession,
      staleTime: 30_000, // 30 seconds cache - prevents excessive checks during typical session
    });

    // AC1: Redirect to login if not authenticated
    if (!session || !session.isValid) {
      throw redirect({
        to: '/admin/login',
      });
    }
  },
  component: AdminLayout,
});

/**
 * Layout component for authenticated admin routes.
 * Renders navigation header for authenticated routes (not login).
 * Renders child routes via Outlet.
 */
function AdminLayout() {
  const router = useRouterState();
  const isLoginPage = router.location.pathname.toLowerCase() === '/admin/login';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Only show navigation on authenticated admin pages, not on login */}
      {!isLoginPage && <AdminNavigation />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
