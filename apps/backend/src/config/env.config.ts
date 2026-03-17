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
