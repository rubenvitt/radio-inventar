import 'express-session';

declare module 'express-session' {
  interface Session {
    userId?: string;
    isAdmin?: boolean;
    username?: string;
    pocketIdState?: string;
    postLoginRedirect?: string;
  }

  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    username?: string;
    pocketIdState?: string;
    postLoginRedirect?: string;
  }
}
