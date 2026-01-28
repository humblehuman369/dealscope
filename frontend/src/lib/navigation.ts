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
 * Route builders for all app screens
 */
export const ROUTES = {
  // Core screens
  search: '/search',
  
  property: (ctx: NavContext) => 
    `/property/${ctx.zpid || 'unknown'}?address=${encodeURIComponent(ctx.address || '')}`,
  
  verdict: (ctx: NavContext) => 
    `/verdict?address=${encodeURIComponent(ctx.address || '')}`,
  
  analysis: (ctx: NavContext) => 
    `/analysis-iq?address=${encodeURIComponent(ctx.address || '')}`,
  
  dealMaker: (ctx: NavContext) => 
    `/deal-maker/${encodeURIComponent(ctx.address || '')}`,
  
  compare: (ctx: NavContext) => 
    `/compare?address=${encodeURIComponent(ctx.address || '')}`,
  
  rentalComps: (ctx: NavContext) => 
    `/rental-comps?address=${encodeURIComponent(ctx.address || '')}`,
  
  // Worksheets
  worksheet: (propertyId: string, strategy: string) => 
    `/worksheet/${propertyId}/${strategy}`,
  
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  
  // User
  dashboard: '/dashboard',
  profile: '/profile',
  billing: '/billing',
  searchHistory: '/search-history',
} as const;

/**
 * Toolbar navigation item IDs
 */
export type ToolbarNavId = 'search' | 'home' | 'trends' | 'analysis' | 'compare' | 'rentals' | 'reports' | 'deals';

/**
 * Get the route for a toolbar navigation item
 * 
 * @param navId - The toolbar item ID
 * @param ctx - Navigation context with address/zpid
 * @returns The route to navigate to
 */
export function getToolbarRoute(navId: ToolbarNavId, ctx: NavContext): string {
  switch (navId) {
    case 'search':
      return ROUTES.search;
    case 'home':
      return ROUTES.property(ctx);
    case 'analysis':
      return ROUTES.analysis(ctx);
    case 'deals':
      return ROUTES.dealMaker(ctx);
    case 'compare':
      return ROUTES.compare(ctx);
    case 'rentals':
      return ROUTES.rentalComps(ctx);
    case 'trends':
      return ROUTES.verdict(ctx);
    case 'reports':
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
