import { SITE_URL } from '@/config/site'

/**
 * Stable `@id`s for the site-wide entity nodes emitted by `SiteJsonLd` (root
 * layout, every page). Page-level graphs (home Article/FAQ, blog posts, press
 * kit) reference these ids instead of re-emitting the nodes so each entity
 * stays a single node.
 */
export const ORG_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`
export const PERSON_ID = `${SITE_URL}/about#brad-geisen`
export const SOFTWARE_ID = `${SITE_URL}/#software`

/** Default founder headshot (white background, 1600×1289) from `public/press/`. */
export const FOUNDER_IMAGE_PATH = '/press/brad-geisen.jpg'
/** Square 512×512 crop of the same headshot for avatars and thumbnails. */
export const FOUNDER_IMAGE_SQUARE_PATH = '/press/brad-geisen-512.jpg'
