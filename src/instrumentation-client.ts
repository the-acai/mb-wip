// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 10% of transactions in production, 100% in dev. Keeps tunnel-route
  // function invocations low on Vercel free tier.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Never sample random sessions — too many tunneled events. Only replay
  // the session when an error actually happens.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // PII is OFF intentionally: Supabase session cookies contain auth tokens
  // that must never leave our infrastructure.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
