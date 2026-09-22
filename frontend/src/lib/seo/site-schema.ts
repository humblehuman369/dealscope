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

/** Founder headshot served from `public/images/`. */
export const FOUNDER_IMAGE_PATH = '/images/brad-geisen.png'
