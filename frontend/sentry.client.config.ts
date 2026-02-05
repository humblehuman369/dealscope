/**
 * Sentry client-side configuration for browser error tracking.
 * This file configures Sentry for the client-side Next.js application.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment tag
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session Replay (optional - comment out if not needed)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
  
  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    /chrome-extension/,
    /moz-extension/,
    // Network errors
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User aborted requests
    "AbortError",
  ],
  
  beforeSend(event) {
    // Don't send PII
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
    }
    return event;
  },
});
