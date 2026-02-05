/**
 * Sentry Edge runtime configuration.
 * This file configures Sentry for Edge functions.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment tag
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 0.1,
  
  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
