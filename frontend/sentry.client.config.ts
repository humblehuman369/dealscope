/**
 * Sentry client-side configuration for browser error tracking.
 * Uses @sentry/browser for compatibility with Next.js 16.
 */
import * as Sentry from "@sentry/browser";

export function initSentry() {
  if (typeof window === "undefined") return;
  
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  
  Sentry.init({
    dsn,
    
    // Environment tag
    environment: process.env.NODE_ENV,
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
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
}

// Export Sentry for manual error capturing
export { Sentry };
