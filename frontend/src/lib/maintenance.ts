/**
 * Site-wide pause. When `MAINTENANCE_MODE=true` is set in Vercel, every page
 * (and therefore the Capacitor apps, which load the live site) serves
 * `/coming-soon`. The root layout reads this at build time, so toggling it
 * requires a redeploy.
 */
export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === 'true'
}

export const COMING_SOON_PATH = '/coming-soon'

/** Paths that keep serving their real content during the pause. */
const MAINTENANCE_PASSTHROUGH_PATHS = new Set([
  COMING_SOON_PATH,
  '/privacy',
  '/terms',
  '/robots.txt',
  '/sitemap.xml',
])

export function isMaintenancePassthrough(pathname: string): boolean {
  return MAINTENANCE_PASSTHROUGH_PATHS.has(pathname) || pathname.startsWith('/.well-known/')
}
