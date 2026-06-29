// apps/backend/src/config/env.config.ts
import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    PUBLIC_APP_URL: z.string().optional(),
    API_TOKEN: z.string().min(32, 'API_TOKEN must be at least 32 characters for security'),
    POCKET_ID_ISSUER_URL: z.string().optional().default(''),
    POCKET_ID_CLIENT_ID: z.string().optional().default(''),
    POCKET_ID_CLIENT_SECRET: z.string().optional().default(''),
    POCKET_ID_REDIRECT_URI: z.string().optional().default(''),
    // radio-admin integration (now the master for BOTH devices AND loans).
    // Two S2S auth modes:
    //   - OAuth2 client_credentials (prod): URL + ISSUER_URL + CLIENT_ID + CLIENT_SECRET
    //   - static api-token (local/dev or a simpler deploy): URL + API_TOKEN
    // When no radio-admin field is set the integration is disabled
    // (RadioAdminService.isEnabled() === false).
    RADIO_ADMIN_URL: z.string().optional().default(''),
    RADIO_ADMIN_ISSUER_URL: z.string().optional().default(''),
    RADIO_ADMIN_CLIENT_ID: z.string().optional().default(''),
    RADIO_ADMIN_CLIENT_SECRET: z.string().optional().default(''),
    // When set, used as a static Bearer token for radio-admin instead of
    // client_credentials (radio-admin's loan API accepts either).
    RADIO_ADMIN_API_TOKEN: z.string().optional().default(''),
    RADIO_ADMIN_CACHE_TTL_MS: z.coerce.number().int().positive().default(30000),
  })
  .superRefine((data, ctx) => {
    // Apply default for PUBLIC_APP_URL
    const publicAppUrl = data.PUBLIC_APP_URL || 'http://localhost:5173';

    // Validate URL format
    let parsed: URL;
    try {
      parsed = new URL(publicAppUrl);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PUBLIC_APP_URL is not a valid URL',
        path: ['PUBLIC_APP_URL'],
      });
      return;
    }

    // Require HTTPS in production
    if (data.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PUBLIC_APP_URL must use HTTPS in production',
        path: ['PUBLIC_APP_URL'],
      });
    }

    const pocketIdRequiredFields = [
      'POCKET_ID_ISSUER_URL',
      'POCKET_ID_CLIENT_ID',
      'POCKET_ID_CLIENT_SECRET',
      'POCKET_ID_REDIRECT_URI',
    ] as const;

    const hasAnyPocketIdConfig = pocketIdRequiredFields.some(
      (field) => data[field].trim().length > 0,
    );

    if (!hasAnyPocketIdConfig) {
      return;
    }

    for (const field of pocketIdRequiredFields) {
      if (data[field].trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is required when Pocket ID authentication is enabled`,
          path: [field],
        });
      }
    }

    for (const [field, value] of [
      ['POCKET_ID_ISSUER_URL', data.POCKET_ID_ISSUER_URL],
      ['POCKET_ID_REDIRECT_URI', data.POCKET_ID_REDIRECT_URI],
    ] as const) {
      try {
        const pocketIdUrl = new URL(value);
        if (data.NODE_ENV === 'production' && pocketIdUrl.protocol !== 'https:') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} must use HTTPS in production`,
            path: [field],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is not a valid URL`,
          path: [field],
        });
      }
    }

    // radio-admin integration. Enabled when ANY radio-admin field is set; then
    // RADIO_ADMIN_URL is always required, and the client_credentials trio
    // (ISSUER_URL/CLIENT_ID/CLIENT_SECRET) is required UNLESS a static
    // RADIO_ADMIN_API_TOKEN is provided.
    const credentialFields = [
      'RADIO_ADMIN_ISSUER_URL',
      'RADIO_ADMIN_CLIENT_ID',
      'RADIO_ADMIN_CLIENT_SECRET',
    ] as const;
    const hasApiToken = data.RADIO_ADMIN_API_TOKEN.trim().length > 0;
    const radioAdminTouched =
      data.RADIO_ADMIN_URL.trim().length > 0 ||
      hasApiToken ||
      credentialFields.some((field) => data[field].trim().length > 0);

    if (!radioAdminTouched) {
      return;
    }

    if (data.RADIO_ADMIN_URL.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RADIO_ADMIN_URL is required when the radio-admin integration is enabled',
        path: ['RADIO_ADMIN_URL'],
      });
    }

    if (!hasApiToken) {
      for (const field of credentialFields) {
        if (data[field].trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when the radio-admin integration uses client_credentials (set RADIO_ADMIN_API_TOKEN to use a static token instead)`,
            path: [field],
          });
        }
      }
    }

    for (const [field, value] of [
      ['RADIO_ADMIN_URL', data.RADIO_ADMIN_URL],
      ['RADIO_ADMIN_ISSUER_URL', data.RADIO_ADMIN_ISSUER_URL],
    ] as const) {
      if (value.trim().length === 0) continue;
      try {
        const url = new URL(value);
        if (data.NODE_ENV === 'production' && url.protocol !== 'https:') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} must use HTTPS in production`,
            path: [field],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is not a valid URL`,
          path: [field],
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    PUBLIC_APP_URL: data.PUBLIC_APP_URL || 'http://localhost:5173',
  }));

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    // Security: Only log field names, not values to prevent ENV structure leakage
    const fieldNames = Object.keys(fieldErrors);
    const errorMessage = `Invalid environment configuration. Missing or invalid fields: ${fieldNames.join(', ')}`;
    throw new Error(errorMessage);
  }
  return result.data;
}
