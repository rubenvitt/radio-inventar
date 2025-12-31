// apps/frontend/src/components/features/admin/AdminNavigation.tsx
// Admin navigation header with links to Dashboard, Devices, History and Logout
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Radio, History, Settings, LogOut } from 'lucide-react';
import { useLogout } from '@/api/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/devices', label: 'Geräte', icon: Radio, exact: false },
  { to: '/admin/history', label: 'Historie', icon: History, exact: false },
  { to: '/admin/settings', label: 'Einstellungen', icon: Settings, exact: false },
] as const;

/**
 * Admin navigation header component.
 * Displays links to all admin sections and a logout button.
 * Touch-optimized with 48px minimum touch targets.
 * Responsive: icons only on mobile, labels on desktop.
 */
export function AdminNavigation() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const logoutMutation = useLogout();

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16" aria-label="Admin Navigation">
          {/* Logo/Title */}
          <Link
            to="/admin"
            className="font-bold text-lg hover:text-primary transition-colors"
          >
            Radio-Inventar Admin
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact
                ? currentPath === to || currentPath === `${to}/`
                : currentPath.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md',
                    'min-h-[48px] touch-manipulation transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </Link>
              );
            })}

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              aria-busy={logoutMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md',
                'min-h-[48px] touch-manipulation transition-colors',
                'text-destructive hover:bg-destructive/10',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <LogOut
                className={cn('h-5 w-5', logoutMutation.isPending && 'animate-pulse')}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {logoutMutation.isPending ? 'Logout...' : 'Logout'}
              </span>
              <span className="sr-only sm:hidden">Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
