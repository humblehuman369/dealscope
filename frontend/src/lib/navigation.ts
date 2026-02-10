/**
 * Centralized Navigation Configuration
 * 
 * SINGLE SOURCE OF TRUTH for all app navigation.
 * All toolbar icons and screen transitions use this config.
 */

export interface NavContext {
  address?: string;
  zpid?: string;
  propertyId?: string;
}

/**
 * Validates that a navigation context has the required fields for navigation.
 * Returns true if the context has a valid address (non-empty string).
 * 
 * @param ctx - The navigation context to validate
 * @returns true if the context is valid for navigation
 */
export function isValidNavContext(ctx: NavContext | undefined | null): boolean {
  if (!ctx) return false;
  
  // Address is required for most routes
  const hasValidAddress = typeof ctx.address === 'string' && ctx.address.trim().length > 0;
  
  return hasValidAddress;
}

/**
 * Validates that a navigation context has required fields and logs warnings if invalid.
 * This is a development helper that also returns the validation result.
 * 
 * @param ctx - The navigation context to validate
 * @param navId - Optional navigation ID for better error messages
 * @returns true if the context is valid for navigation
 */
export function validateNavContextWithWarning(ctx: NavContext | undefined | null, navId?: string): boolean {
  const isValid = isValidNavContext(ctx);
  
  if (!isValid && process.env.NODE_ENV === 'development') {
    console.warn(
      `[Navigation] Invalid navigation context${navId ? ` for "${navId}"` : ''}.`,
      'Expected address to be a non-empty string.',
      'Context:',
      ctx
    );
  }
  
  return isValid;
}

/**
 * Route builders for all app screens
 */
export const ROUTES = {
  // Core screens
  search: '/search',
  
  property: (ctx: NavContext) => 
    `/property/${ctx.zpid || 'unknown'}?address=${encodeURIComponent(ctx.address || '')}`,
  
  verdict: (ctx: NavContext) => {
    const params = new URLSearchParams({ address: ctx.address || '' });
    if (ctx.propertyId) params.set('propertyId', ctx.propertyId);
    return `/verdict?${params.toString()}`;
  },
  
  // DEPRECATED: analysis route now redirects to verdict
  // Kept for backwards compatibility with any external links
  analysis: (ctx: NavContext) => {
    // Redirect to verdict route (analysis-iq page now auto-redirects)
    const params = new URLSearchParams({ address: ctx.address || '' });
    if (ctx.propertyId) params.set('propertyId', ctx.propertyId);
    return `/verdict?${params.toString()}`;
  },
  
  strategy: (ctx: NavContext) => {
    const params = new URLSearchParams({ address: ctx.address || '' });
    if (ctx.propertyId) params.set('propertyId', ctx.propertyId);
    return `/strategy?${params.toString()}`;
  },

  dealMaker: (ctx: NavContext) => 
    `/deal-maker/${encodeURIComponent(ctx.address || '')}`,
  
  compare: (ctx: NavContext) => 
    `/price-intel?view=sale&address=${encodeURIComponent(ctx.address || '')}`,
  
  rentalComps: (ctx: NavContext) => 
    `/price-intel?view=rent&address=${encodeURIComponent(ctx.address || '')}`,
  
  priceChecker: (ctx: NavContext) =>
    `/price-intel?address=${encodeURIComponent(ctx.address || '')}`,
  
  // Worksheets
  worksheet: (propertyId: string, strategy: string) => 
    `/worksheet/${propertyId}/${strategy}`,
  
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  
  // User
  dashboard: '/search',  // Dashboard removed — redirect to search
  profile: '/profile',
  billing: '/billing',
  searchHistory: '/search-history',
  savedProperties: '/saved-properties',

  // Admin
  admin: '/admin',
} as const;

/**
 * Toolbar navigation item IDs
 */
export type ToolbarNavId = 'home' | 'analysis' | 'compare' | 'rentals' | 'reports' | 'deals';

/**
 * Get the route for a toolbar navigation item
 * 
 * @param navId - The toolbar item ID
 * @param ctx - Navigation context with address/zpid
 * @returns The route to navigate to, or search page if context is invalid
 */
export function getToolbarRoute(navId: ToolbarNavId, ctx: NavContext): string {
  // Validate context - return to search if invalid
  if (!validateNavContextWithWarning(ctx, navId)) {
    return ROUTES.search;
  }
  
  switch (navId) {
    case 'home':
      return ROUTES.property(ctx);
    case 'analysis':
      // Analysis now redirects to verdict (combined page)
      return ROUTES.verdict(ctx);
    case 'deals':
      return ROUTES.dealMaker(ctx);
    case 'compare':
      return ROUTES.compare(ctx);
    case 'rentals':
      return ROUTES.rentalComps(ctx);
    case 'reports':
      // Reports is disabled in the UI, but route to verdict as fallback
      return ROUTES.verdict(ctx);
    default:
      return ROUTES.search;
  }
}

/**
 * Build a full address string from property data
 */
export function buildFullAddress(property: {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const parts = [property.address];
  if (property.city) parts.push(property.city);
  
  const stateZip = [property.state, property.zip].filter(Boolean).join(' ');
  if (stateZip) parts.push(stateZip);
  
  return parts.join(', ');
}
