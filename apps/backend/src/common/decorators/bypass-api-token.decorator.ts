import { SetMetadata } from '@nestjs/common';

export const BYPASS_API_TOKEN_KEY = 'bypassApiToken';

/**
 * Marks a route as bypassing API token validation.
 * Use ONLY for:
 * - Token verification endpoint (chicken-and-egg problem)
 * - Health check endpoints (for load balancers)
 */
export const BypassApiToken = () => SetMetadata(BYPASS_API_TOKEN_KEY, true);
