/**
 * Public marketing/content routes get a site-wide legal footer.
 * Logged-in product surfaces stay chrome-only so analysis tools are not
 * crowded by a copyright bar.
 */
const APP_ROUTE_PREFIXES = [
  '/admin',
  '/analyzing',
  '/billing',
  '/budget',
  '/checkout',
  '/compare',
  '/dashboard',
  '/deal-maker',
  '/deals',
  '/debug',
  '/directory',
  '/discovery',
  '/lenders',
  '/map-search',
  '/onboarding',
  '/photos',
  '/pipeline',
  '/price-intel',
  '/profile',
  '/property',
  '/rehab',
  '/rental-comps',
  '/saved-properties',
  '/search-history',
  '/search',
] as const

/**
 * These pages already render a copyright line with LEGAL_ENTITY_DBA.
 * Skip the shared bar there so the legal name is not duplicated.
 */
const PAGES_WITH_OWN_LEGAL_FOOTER = [
  '/about',
  '/help',
  '/login',
  '/pricing',
  '/privacy',
  '/register',
  '/terms',
  '/what-is-dealgapiq',
] as const

export function shouldShowPublicLegalFooter(pathname: string): boolean {
  const path = pathname === '' ? '/' : pathname
  if (APP_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false
  }
  if (PAGES_WITH_OWN_LEGAL_FOOTER.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false
  }
  if (path === '/strategies' || path.startsWith('/strategies/')) return false
  return true
}
