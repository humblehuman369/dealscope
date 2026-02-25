/**
 * useDeepLinking — Handles incoming URLs and routes to the correct mobile screen.
 *
 * Supports:
 *   - Custom scheme: dealgapiq://verdict?address=123+Main+St&price=350000
 *   - Universal links: https://dealgapiq.com/verdict?address=123+Main+St&price=350000
 *   - Both cold start (app was closed) and warm open (app was backgrounded)
 *
 * Frontend → Mobile route mapping:
 *   /verdict?address=X        → /verdict-iq/[address]
 *   /property?address=X       → /property-details/[address]
 *   /property/[zpid]          → /property-details/[address] (zpid as address)
 *   /deal-gap?address=X       → /deal-gap/[address]
 *   /deal-maker/[address]     → /deal-maker/[address]
 *   /worksheet/[id]/[strategy]→ /worksheet/[strategy]
 *   /price-intel?address=X    → /price-intel/[address]
 *   /strategy?address=X       → /strategy-iq/[address]
 *   /search?q=X               → /(tabs)/home (prefill search)
 *   /analyzing?address=X      → /analyzing/[address]
 *   /                         → /(tabs)/home
 */

import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '../context/AuthContext';

// ─── URL → Route mapping ─────────────────────────────────────────

/** Routes that require authentication before deep-link navigation */
const PROTECTED_ROUTES = new Set([
  '/verdict-iq/[address]',
  '/strategy-iq/[address]',
  '/worksheet/[strategy]',
  '/deal-maker/[address]',
  '/deal-gap/[address]',
  '/price-intel/[address]',
  '/portfolio/[id]',
  '/photos/[zpid]',
  '/rehab/index',
  '/billing',
  '/profile/index',
]);

/** Only accept deep links from our own domain or custom scheme (null host) */
const ALLOWED_HOSTS = new Set<string | null>([null, '', 'dealgapiq.com', 'www.dealgapiq.com']);

/** Max length for an address param — well beyond any real US address */
const MAX_ADDRESS_LENGTH = 500;

/**
 * Sanitize an address coming from an external deep link.
 * Rejects null bytes, HTML tags, excessively long strings, and
 * trims leading/trailing whitespace.  Returns empty string on failure
 * so the caller's existing `if (!addr)` guard redirects to home.
 */
function sanitizeAddress(raw: string): string {
  if (!raw || raw.length > MAX_ADDRESS_LENGTH) return '';
  // Strip null bytes and HTML/script tags
  let clean = raw.replace(/\0/g, '').replace(/<[^>]*>/g, '');
  // Collapse whitespace and trim
  clean = clean.replace(/\s+/g, ' ').trim();
  // Only allow printable ASCII + common address chars (letters, digits,
  // spaces, commas, periods, hashes, hyphens, apostrophes, plus signs)
  if (!/^[a-zA-Z0-9\s,.\-#'+/]+$/.test(clean)) return '';
  return clean;
}

interface ParsedRoute {
  pathname: string;
  params: Record<string, string>;
}

/**
 * Parse an incoming URL (scheme or https) into a mobile route.
 * Returns null if the URL doesn't match any known route.
 */
function parseDeepLink(url: string): ParsedRoute | null {
  try {
    const parsed = ExpoLinking.parse(url);

    // Reject URLs from unknown hosts (prevents open-redirect via crafted links)
    if (parsed.hostname && !ALLOWED_HOSTS.has(parsed.hostname)) {
      if (__DEV__) console.warn('[DeepLink] Rejected unknown host:', parsed.hostname);
      return null;
    }

    const path = (parsed.path || '').replace(/^\//, '').replace(/\/$/, '');
    const q = parsed.queryParams || {};

    // Extract common property params from query string (sanitized)
    const propertyParams = (addr: string) => ({
      address: addr,
      ...(q.price ? { price: String(q.price) } : {}),
      ...(q.beds ? { beds: String(q.beds) } : {}),
      ...(q.baths ? { baths: String(q.baths) } : {}),
      ...(q.sqft ? { sqft: String(q.sqft) } : {}),
      ...(q.rent ? { rent: String(q.rent) } : {}),
      ...(q.city ? { city: String(q.city) } : {}),
      ...(q.state ? { state: String(q.state) } : {}),
      ...(q.zip ? { zip: String(q.zip) } : {}),
    });

    // ── Route matching ──────────────────────────────────────
    // Root
    if (!path || path === '' || path === 'home') {
      return { pathname: '/(tabs)/home', params: {} };
    }

    // Verdict
    if (path === 'verdict' || path === 'verdict-iq') {
      const addr = sanitizeAddress(String(q.address || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/verdict-iq/[address]', params: propertyParams(addr) };
    }

    // Strategy / Analysis
    if (path === 'strategy' || path === 'strategy-iq') {
      const addr = sanitizeAddress(String(q.address || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/strategy-iq/[address]', params: propertyParams(addr) };
    }

    // Analyzing
    if (path === 'analyzing') {
      const addr = sanitizeAddress(String(q.address || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/analyzing/[address]', params: propertyParams(addr) };
    }

    // Property — /property?address=X or /property/[zpid]
    if (path === 'property' || path.startsWith('property/')) {
      const zpid = path.split('/')[1];
      const addr = sanitizeAddress(String(q.address || zpid || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/property-details/[address]', params: propertyParams(addr) };
    }

    // Deal Gap
    if (path === 'deal-gap') {
      const addr = sanitizeAddress(String(q.address || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/deal-gap/[address]', params: propertyParams(addr) };
    }

    // Deal Maker — /deal-maker/[address] or /deal-maker?address=X
    if (path === 'deal-maker' || path.startsWith('deal-maker/')) {
      const pathAddr = path.split('/')[1];
      const addr = sanitizeAddress(String(q.address || pathAddr || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/deal-maker/[address]', params: { address: addr } };
    }

    // Worksheet — /worksheet/[id]/[strategy] or /worksheet?strategy=X
    if (path === 'worksheet' || path.startsWith('worksheet/')) {
      const parts = path.split('/');
      const strategy = String(q.strategy || parts[2] || parts[1] || 'ltr');
      const wsAddr = q.address ? sanitizeAddress(String(q.address)) : '';
      return {
        pathname: '/worksheet/[strategy]',
        params: {
          strategy,
          ...(wsAddr ? propertyParams(wsAddr) : {}),
        },
      };
    }

    // Price Intel
    if (path === 'price-intel') {
      const addr = sanitizeAddress(String(q.address || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/price-intel/[address]', params: propertyParams(addr) };
    }

    // Search
    if (path === 'search') {
      return { pathname: '/(tabs)/home', params: {} };
    }

    // Strategy education
    if (path.startsWith('strategies/')) {
      const strategySlug = path.split('/')[1] || '';
      const slugMap: Record<string, string> = {
        'long-term-rental': 'ltr',
        'short-term-rental': 'str',
        'brrrr': 'brrrr',
        'fix-flip': 'flip',
        'house-hack': 'house_hack',
        'wholesale': 'wholesale',
      };
      const id = slugMap[strategySlug] || 'ltr';
      return { pathname: '/learn/[strategy]', params: { strategy: id } };
    }

    // National averages
    if (path === 'national-averages') {
      return { pathname: '/national-averages/index', params: {} };
    }

    // Photos
    if (path === 'photos') {
      const addr = sanitizeAddress(String(q.address || q.zpid || ''));
      if (!addr) return { pathname: '/(tabs)/home', params: {} };
      return { pathname: '/photos/[zpid]', params: { zpid: addr, address: addr } };
    }

    // Fallback — unknown path → home
    return { pathname: '/(tabs)/home', params: {} };
  } catch (err) {
    if (__DEV__) console.warn('[DeepLink] Failed to parse URL:', url, err);
    return null;
  }
}

// ─── Hook ────────────────────────────────────────────────────────

export function useDeepLinking() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const processedRef = useRef<Set<string>>(new Set());
  const pendingUrlRef = useRef<string | null>(null);

  // Ref keeps current auth state accessible in event-listener callbacks
  // without re-subscribing on every auth change
  const authStateRef = useRef({ isAuthenticated, isLoading });
  authStateRef.current = { isAuthenticated, isLoading };

  const handleUrl = (url: string) => {
    if (processedRef.current.has(url)) return;
    if (pendingUrlRef.current === url) return;

    const route = parseDeepLink(url);
    if (!route) return;

    const { isAuthenticated: authed, isLoading: loading } = authStateRef.current;

    // Queue URL while auth state is still resolving (cold-start race)
    if (loading) {
      pendingUrlRef.current = url;
      return;
    }

    processedRef.current.add(url);
    setTimeout(() => processedRef.current.delete(url), 2000);

    // Redirect unauthenticated users to login for protected routes,
    // encoding the intended destination so login can restore it
    if (PROTECTED_ROUTES.has(route.pathname) && !authed) {
      if (__DEV__) console.log('[DeepLink] Auth required, redirecting to login');
      router.replace({
        pathname: '/auth/login' as any,
        params: { returnTo: JSON.stringify(route) },
      });
      return;
    }

    if (__DEV__) console.log('[DeepLink] Navigating:', route.pathname, route.params);
    router.push({ pathname: route.pathname as any, params: route.params });
  };

  // Process queued URL once auth state resolves
  useEffect(() => {
    if (!isLoading && pendingUrlRef.current) {
      const url = pendingUrlRef.current;
      pendingUrlRef.current = null;
      handleUrl(url);
    }
  }, [isLoading]);

  useEffect(() => {
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);
}

// ─── Helpers for generating shareable URLs ───────────────────────

const WEB_BASE = 'https://dealgapiq.com';

export function buildShareUrl(
  route: 'verdict' | 'property' | 'deal-gap' | 'strategy' | 'deal-maker' | 'worksheet' | 'price-intel',
  params: Record<string, string | number>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return `${WEB_BASE}/${route}?${searchParams.toString()}`;
}

/**
 * Build a shareable URL for a property verdict.
 * This is the most common share scenario.
 */
export function buildVerdictShareUrl(address: string, params?: {
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  city?: string;
  state?: string;
}): string {
  return buildShareUrl('verdict', { address, ...params });
}

export default useDeepLinking;
