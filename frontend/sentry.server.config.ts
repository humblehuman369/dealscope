/**
 * Sentry server-side configuration for Node.js error tracking.
 * This file configures Sentry for server-side Next.js rendering.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment tag
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
