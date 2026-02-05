'use client';

import { useEffect } from 'react';
import { initSentry } from '../../sentry.client.config';

/**
 * Client component that initializes Sentry on mount.
 * Must be rendered in a client context.
 */
export function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);
  
  return null;
}
