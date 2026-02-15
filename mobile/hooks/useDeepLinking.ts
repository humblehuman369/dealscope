/**
 * useDeepLinking — Handles incoming URLs and routes to the correct mobile screen.
 *
 * Supports:
 *   - Custom scheme: investiq://verdict?address=123+Main+St&price=350000
 *   - Universal links: https://realvestiq.com/verdict?address=123+Main+St&price=350000
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

// ─── URL → Route mapping ─────────────────────────────────────────

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
  const processedRef = useRef<Set<string>>(new Set());

  const handleUrl = (url: string) => {
    // Dedupe — don't handle the same URL twice in rapid succession
    if (processedRef.current.has(url)) return;
    processedRef.current.add(url);
    // Clear after 2s to allow re-opening same link
    setTimeout(() => processedRef.current.delete(url), 2000);

    const route = parseDeepLink(url);
    if (!route) return;

    if (__DEV__) {
      console.log('[DeepLink] Navigating:', route.pathname, route.params);
    }

    // Use push so user can go back
    router.push({ pathname: route.pathname as any, params: route.params });
  };

  useEffect(() => {
    // 1. Cold start — check if app was opened via URL
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // 2. Warm open — app is already running, URL comes in
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);
}

// ─── Helpers for generating shareable URLs ───────────────────────

const WEB_BASE = 'https://realvestiq.com';

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
