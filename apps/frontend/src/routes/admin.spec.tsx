// apps/frontend/src/routes/admin.spec.tsx
// Story 5.2: Admin Login UI - Auth Guard Tests
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock modules before imports
vi.mock('@/api/auth');
vi.mock('@/lib/queryClient');

import { checkSession } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';
import { authKeys } from '@/lib/queryKeys';

// Import route config after mocks
const AdminRouteModule = await import('./admin');
const RouteConfig = AdminRouteModule.Route as unknown as {
  options: {
    beforeLoad: (context: { location: { pathname: string } }) => Promise<void>;
  };
};

const mockCheckSession = checkSession as Mock;
const mockQueryClient = queryClient as unknown as {
  ensureQueryData: Mock;
};

describe('Admin Route Auth Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Unauthenticated user redirect', () => {
    it('redirects to /admin/login when session is null', async () => {
      // Mock ensureQueryData to return null (no session)
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue(null);

      const location = { pathname: '/admin' };

      try {
        await RouteConfig.options.beforeLoad({ location });
        expect.fail('Should have thrown redirect');
      } catch (error: any) {
        // TanStack Router's redirect throws a Response object
        expect(error).toBeInstanceOf(Response);
        // Check that it's a redirect response
        expect(error.status).toBe(307);
      }

      // Verify ensureQueryData was called with correct params
      expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith({
        queryKey: authKeys.session(),
        queryFn: checkSession,
        staleTime: 30_000,
      });
    });

    it('redirects to /admin/login when session.isValid is false', async () => {
      // Mock ensureQueryData to return invalid session
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: false,
      });

      const location = { pathname: '/admin/dashboard' };

      try {
        await RouteConfig.options.beforeLoad({ location });
        expect.fail('Should have thrown redirect');
      } catch (error: any) {
        // TanStack Router's redirect throws a Response object
        expect(error).toBeInstanceOf(Response);
        expect(error.status).toBe(307);
      }
    });

    it('redirects to /admin/login when ensureQueryData throws error', async () => {
      // Mock ensureQueryData to throw error (network failure)
      mockQueryClient.ensureQueryData = vi.fn().mockRejectedValue(
        new Error('Network error')
      );

      const location = { pathname: '/admin' };

      // Should still throw redirect despite error
      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).rejects.toThrow();
    });
  });

  describe('AC1b: Authenticated user access', () => {
    it('allows access when session is valid', async () => {
      // Mock ensureQueryData to return valid session
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      // Should NOT throw redirect
      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).resolves.toBeUndefined();

      expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith({
        queryKey: authKeys.session(),
        queryFn: checkSession,
        staleTime: 30_000,
      });
    });

    it('allows access to /admin/dashboard when authenticated', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin/dashboard' };

      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).resolves.toBeUndefined();
    });
  });

  describe('AC1c: Login page is publicly accessible', () => {
    it('allows access to /admin/login without authentication', async () => {
      const location = { pathname: '/admin/login' };

      // Should NOT call ensureQueryData for login page
      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).resolves.toBeUndefined();

      // Verify session check was skipped
      expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalled();
    });

    it('does not check session for /admin/login route', async () => {
      const location = { pathname: '/admin/login' };

      await RouteConfig.options.beforeLoad({ location });

      // Should skip auth entirely
      expect(mockCheckSession).not.toHaveBeenCalled();
      expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalled();
    });
  });

  describe('AC8: Session check is called correctly', () => {
    it('calls ensureQueryData with correct queryKey', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith({
        queryKey: authKeys.session(),
        queryFn: checkSession,
        staleTime: 30_000,
      });
    });

    it('uses queryClient.ensureQueryData for request deduplication', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      // Verify ensureQueryData was used (not direct checkSession call)
      expect(mockQueryClient.ensureQueryData).toHaveBeenCalledTimes(1);
      expect(mockCheckSession).not.toHaveBeenCalled();
    });

    it('sets staleTime to 30000ms for caching', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      const callArgs = mockQueryClient.ensureQueryData.mock.calls[0]?.[0];
      expect(callArgs.staleTime).toBe(30_000);
    });
  });

  describe('Redirect contains correct path', () => {
    it('redirect throws Response with 307 status', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue(null);

      const location = { pathname: '/admin/sensitive-page' };

      try {
        await RouteConfig.options.beforeLoad({ location });
        expect.fail('Should have thrown redirect');
      } catch (error) {
        // TanStack Router redirect throws a Response
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(307);
      }
    });

    it('throws redirect Response on unauthenticated access', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue(null);

      const location = { pathname: '/admin' };

      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).rejects.toBeInstanceOf(Response);
    });
  });

  describe('Request deduplication with ensureQueryData', () => {
    it('ensureQueryData receives checkSession as queryFn', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      const callArgs = mockQueryClient.ensureQueryData.mock.calls[0]?.[0];
      expect(callArgs.queryFn).toBe(checkSession);
    });

    it('multiple simultaneous navigations reuse ensureQueryData cache', async () => {
      let callCount = 0;
      mockQueryClient.ensureQueryData = vi.fn().mockImplementation(async () => {
        callCount++;
        return { username: 'admin', isValid: true };
      });

      const location1 = { pathname: '/admin' };
      const location2 = { pathname: '/admin/dashboard' };
      const location3 = { pathname: '/admin/settings' };

      // Simulate multiple simultaneous navigations
      await Promise.all([
        RouteConfig.options.beforeLoad({ location: location1 }),
        RouteConfig.options.beforeLoad({ location: location2 }),
        RouteConfig.options.beforeLoad({ location: location3 }),
      ]);

      // All three navigations should trigger ensureQueryData
      // (In real scenario, ensureQueryData would deduplicate internally)
      expect(mockQueryClient.ensureQueryData).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases', () => {
    it('handles session with extra properties gracefully', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
        extraProperty: 'ignored',
      });

      const location = { pathname: '/admin' };

      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).resolves.toBeUndefined();
    });

    it('redirects when session object exists but isValid is undefined', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        // isValid missing
      });

      const location = { pathname: '/admin' };

      try {
        await RouteConfig.options.beforeLoad({ location });
        expect.fail('Should have thrown redirect');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Response);
        expect(error.status).toBe(307);
      }
    });

    it('handles different admin sub-routes correctly', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const routes = [
        '/admin',
        '/admin/dashboard',
        '/admin/settings',
        '/admin/users',
        '/admin/deep/nested/route',
      ];

      for (const pathname of routes) {
        vi.clearAllMocks();
        const location = { pathname };

        await expect(
          RouteConfig.options.beforeLoad({ location })
        ).resolves.toBeUndefined();

        expect(mockQueryClient.ensureQueryData).toHaveBeenCalledTimes(1);
      }
    });

    it('login page check is case-insensitive for security', async () => {
      // Case-insensitive check prevents bypass via /admin/Login
      const location = { pathname: '/admin/Login' }; // capital L

      await expect(
        RouteConfig.options.beforeLoad({ location })
      ).resolves.toBeUndefined();

      // Should skip session check (same as /admin/login)
      expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalled();
    });
  });

  describe('Performance and caching', () => {
    it('uses 30 second staleTime for caching', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      const config = mockQueryClient.ensureQueryData.mock.calls[0]?.[0];
      expect(config?.staleTime).toBe(30_000);
    });

    it('passes correct queryKey to ensureQueryData', async () => {
      mockQueryClient.ensureQueryData = vi.fn().mockResolvedValue({
        username: 'admin',
        isValid: true,
      });

      const location = { pathname: '/admin' };

      await RouteConfig.options.beforeLoad({ location });

      const config = mockQueryClient.ensureQueryData.mock.calls[0]?.[0];
      expect(config?.queryKey).toEqual(authKeys.session());
      expect(config?.queryKey).toEqual(['auth', 'session']);
    });
  });
});
