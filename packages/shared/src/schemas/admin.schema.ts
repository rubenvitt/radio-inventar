// packages/shared/src/schemas/admin.schema.ts
import { z } from 'zod';

export const ADMIN_FIELD_LIMITS = Object.freeze({
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  PASSWORD_MIN: 8,
  // bcrypt only hashes first 72 bytes - higher values waste CPU and enable DoS (Review #2)
  PASSWORD_MAX: 72,
} as const);

export const AdminUserSchema = z.object({
  // Prisma uses cuid() (v1), not cuid2() - must match schema.prisma
  id: z.string().cuid(),
  username: z.string().trim().min(ADMIN_FIELD_LIMITS.USERNAME_MIN).max(ADMIN_FIELD_LIMITS.USERNAME_MAX),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SessionDataSchema = z.object({
  username: z.string(),
  isValid: z.boolean(),
});

export const LogoutResponseSchema = z.object({
  message: z.string(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// ================================================================================
// Dashboard & History Schemas (Story 6.1)
// ================================================================================

/**
 * Dashboard Statistics Schema
 * Used for validating the response from GET /api/admin/dashboard
 */
export const DashboardStatsSchema = z.object({
  availableCount: z.number().int().nonnegative(),
  onLoanCount: z.number().int().nonnegative(),
  defectCount: z.number().int().nonnegative(),
  maintenanceCount: z.number().int().nonnegative(),
  activeLoans: z.array(z.object({
    id: z.string().cuid(), // Using cuid (v1) to match Prisma schema
    device: z.object({
      callSign: z.string(),
      deviceType: z.string(),
    }),
    borrowerName: z.string(),
    borrowedAt: z.string().datetime(),
  })).max(50), // Enforce max 50 active loans limit
});

/**
 * History Filters Schema with Date Range Validation
 * Used for validating query parameters for GET /api/admin/history
 */
export const HistoryFiltersSchema = z.object({
  deviceId: z.string().cuid().optional(), // Using cuid (v1)
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(100),
}).refine(data => {
  // Validate date range not exceeding 365 days
  if (data.from && data.to) {
    const diff = new Date(data.to).getTime() - new Date(data.from).getTime();
    const maxDays = 365;
    return diff <= maxDays * 24 * 60 * 60 * 1000 && diff >= 0;
  }
  return true;
}, {
  message: 'Datumsbereich darf maximal 365 Tage betragen und "from" muss vor "to" liegen'
});

/**
 * History Item Schema
 * Represents a single loan record in the history
 */
export const HistoryItemSchema = z.object({
  id: z.string().cuid(), // Using cuid (v1)
  device: z.object({
    id: z.string().cuid(),
    callSign: z.string(),
    serialNumber: z.string().nullable(), // Story 6.4: Required for CSV export (AC3)
    deviceType: z.string(),
    status: z.string(),
  }),
  borrowerName: z.string(),
  borrowedAt: z.string().datetime(),
  returnedAt: z.string().datetime().nullable(),
  returnNote: z.string().nullable(), // Note: Field name is "returnNote" in Prisma schema, not "returnNotes"
});

/**
 * History Response Schema with Pagination Metadata
 * Used for validating the response from GET /api/admin/history
 */
export const HistoryResponseSchema = z.object({
  data: z.array(HistoryItemSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

// Type exports
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type HistoryFilters = z.infer<typeof HistoryFiltersSchema>;
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

// ================================================================================
// Admin Credentials Change Schemas
// ================================================================================

/**
 * Schema for changing admin credentials (username and/or password)
 * Requires current password for security verification
 */
export const ChangeCredentialsSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Aktuelles Passwort ist erforderlich')
    .max(ADMIN_FIELD_LIMITS.PASSWORD_MAX),
  newUsername: z.string()
    .trim()
    .min(ADMIN_FIELD_LIMITS.USERNAME_MIN, `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben`)
    .max(ADMIN_FIELD_LIMITS.USERNAME_MAX, `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben`)
    .optional(),
  newPassword: z.string()
    .min(ADMIN_FIELD_LIMITS.PASSWORD_MIN, `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben`)
    .max(ADMIN_FIELD_LIMITS.PASSWORD_MAX, `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben`)
    .optional(),
}).refine(data => data.newUsername || data.newPassword, {
  message: 'Mindestens neuer Benutzername oder neues Passwort muss angegeben werden',
});

/**
 * Response schema for credential change
 */
export const ChangeCredentialsResponseSchema = z.object({
  message: z.string(),
  username: z.string(),
});

export type ChangeCredentials = z.infer<typeof ChangeCredentialsSchema>;
export type ChangeCredentialsResponse = z.infer<typeof ChangeCredentialsResponseSchema>;
