// packages/shared/src/schemas/setup.schema.ts
import { z } from 'zod';
import { ADMIN_FIELD_LIMITS } from './admin.schema.js';

/**
 * Setup Status Schema
 * Used to check if first-time setup has been completed
 */
export const SetupStatusSchema = z.object({
  isSetupComplete: z.boolean(),
});

/**
 * Create First Admin Schema
 * Used during initial setup to create the first admin user
 * Reuses ADMIN_FIELD_LIMITS for consistent validation
 */
export const CreateFirstAdminSchema = z.object({
  username: z
    .string()
    .trim()
    .min(
      ADMIN_FIELD_LIMITS.USERNAME_MIN,
      `Benutzername muss mindestens ${ADMIN_FIELD_LIMITS.USERNAME_MIN} Zeichen haben`
    )
    .max(
      ADMIN_FIELD_LIMITS.USERNAME_MAX,
      `Benutzername darf maximal ${ADMIN_FIELD_LIMITS.USERNAME_MAX} Zeichen haben`
    ),
  password: z
    .string()
    .min(
      ADMIN_FIELD_LIMITS.PASSWORD_MIN,
      `Passwort muss mindestens ${ADMIN_FIELD_LIMITS.PASSWORD_MIN} Zeichen haben`
    )
    .max(
      ADMIN_FIELD_LIMITS.PASSWORD_MAX,
      `Passwort darf maximal ${ADMIN_FIELD_LIMITS.PASSWORD_MAX} Zeichen haben`
    ),
});

// Type exports
export type SetupStatus = z.infer<typeof SetupStatusSchema>;
export type CreateFirstAdmin = z.infer<typeof CreateFirstAdminSchema>;
