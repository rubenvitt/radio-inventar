import 'express-session';

declare module 'express-session' {
  interface Session {
    userId?: string;
    isAdmin?: boolean;
    username?: string;
  }

  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    username?: string;
  }
}
