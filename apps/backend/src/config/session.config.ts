// apps/backend/src/config/session.config.ts
import session from 'express-session';
import { AUTH_CONFIG } from '@radio-inventar/shared';

/**
 * Cookie options for session cookie.
 * Exported for use in clearCookie() to ensure consistent options (Review #2 fix).
 */
export const getSessionCookieOptions = (): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  path: string;
} => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

/**
 * Session configuration for express-session.
 * NOTE: SESSION_SECRET validation is handled by env.config.ts at application startup.
 * This function assumes SESSION_SECRET is already validated.
 */
export const getSessionConfig = (): session.SessionOptions => {
  // C3 fix: Runtime guard for SESSION_SECRET
  // While env.config.ts validates this at startup, we add defensive check
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required but not configured');
  }

  const cookieOptions = getSessionCookieOptions();

  return {
    name: AUTH_CONFIG.SESSION_COOKIE_NAME,
    secret,
    resave: false,
    saveUninitialized: false,
    // M4 SECURITY NOTE: rolling: true extends session on each request
    // CURRENT BEHAVIOR: Sessions can live indefinitely with continuous activity
    // POST-MVP ENHANCEMENT: Implement absolute session timeout
    // Recommended approach:
    //   - Store session creation timestamp in session data
    //   - Add middleware to check absolute timeout (e.g., 7 days max)
    //   - Force re-authentication after absolute timeout regardless of activity
    // DECISION: Defer to Post-MVP - 24h rolling timeout is acceptable for MVP
    rolling: true,
    cookie: {
      ...cookieOptions,
      maxAge: AUTH_CONFIG.SESSION_TIMEOUT_MS, // 24 hours (AC5)
    },
  };
};
