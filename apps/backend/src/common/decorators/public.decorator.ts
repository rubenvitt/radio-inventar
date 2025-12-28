import { SetMetadata } from '@nestjs/common';

// Note: SCREAMING_SNAKE_CASE for constant follows NestJS convention
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * FIX L3: Marks a route as public, bypassing SessionAuthGuard
 *
 * Use this decorator on controller methods that should be accessible
 * without authentication (e.g., login endpoint).
 *
 * @example
 * ```typescript
 * @Post('login')
 * @Public()
 * async login(@Body() dto: LoginDto) {
 *   // ...
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
