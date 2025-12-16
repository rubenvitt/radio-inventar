// apps/backend/src/config/env.config.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

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
