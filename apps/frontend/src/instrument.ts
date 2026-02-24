import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://0e1850d5941ac2f43813172b53c3a4bc@sentry.rubeen.dev/4',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', /^https:\/\/.*\.rubeen\.dev/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
});
