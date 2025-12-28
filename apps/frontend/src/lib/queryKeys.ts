// ARCHITECTURE FIX #4: Import DeviceFilters for type-safe query keys
import type { DeviceFilters } from '@/api/admin-devices';
import type { DeviceStatus } from '@radio-inventar/shared';

// Type-safe filter interfaces for query keys
interface PublicDeviceFilters {
  status?: DeviceStatus;
  take?: number;
  skip?: number;
}

interface LoanFilters {
  deviceId?: string;
  borrowerName?: string;
  status?: 'active' | 'returned';
  take?: number;
  skip?: number;
}

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters?: PublicDeviceFilters) =>
    [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
};

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters?: LoanFilters) =>
    [...loanKeys.lists(), filters] as const,
  active: () => [...loanKeys.all, 'active'] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: string) => [...loanKeys.details(), id] as const,
};

export const borrowerKeys = {
  all: ['borrowers'] as const,
  suggestions: () => [...borrowerKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...borrowerKeys.suggestions(), query] as const,
};

// Story 5.2: Auth query keys for admin authentication
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

// Story 5.4: Admin device management query keys
// ARCHITECTURE FIX #4: Properly typed filters parameter
export const adminDeviceKeys = {
  all: ['adminDevices'] as const,
  lists: () => [...adminDeviceKeys.all, 'list'] as const,
  list: (filters?: DeviceFilters) => [...adminDeviceKeys.lists(), filters] as const,
  details: () => [...adminDeviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminDeviceKeys.details(), id] as const,
};

// Story 6.2: Admin dashboard query keys
export const adminDashboardKeys = {
  all: ['adminDashboard'] as const,
  stats: () => [...adminDashboardKeys.all, 'stats'] as const,
};

// Story 6.3: Admin history query keys
// Note: Using | undefined for exactOptionalPropertyTypes compatibility
export interface HistoryQueryFilters {
  deviceId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  /** H4 FIX: Cache-busting timestamp to force fresh data on export */
  _t?: number | undefined;
}

export const adminHistoryKeys = {
  all: ['adminHistory'] as const,
  lists: () => [...adminHistoryKeys.all, 'list'] as const,
  list: (filters?: HistoryQueryFilters) => [...adminHistoryKeys.lists(), filters] as const,
};

// Story 6.5: Admin print template query keys
export const adminPrintKeys = {
  all: ['adminPrint'] as const,
  template: () => [...adminPrintKeys.all, 'template'] as const,
};

// First-time setup query keys
export const setupKeys = {
  all: ['setup'] as const,
  status: () => [...setupKeys.all, 'status'] as const,
};
