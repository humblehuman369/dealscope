/**
 * Approved launch facts shared by the home page copy, JSON-LD, the press kit,
 * the launch post, and the sitemap. Prices and directory counts live in
 * `@/lib/claims`; legal names live in `@/lib/brand`. Anything dated or
 * contact-related for the GEO/AEO launch belongs here so it cannot drift.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

/** Home page H1, verbatim. Also the `Article.headline` in the home JSON-LD. */
export const HOME_H1 = 'Find a Great Deal & How to Close It.'

/** Shown under the hero lede and emitted as `Article.dateModified`. */
export const HOME_UPDATED_AT = '2026-09-21'

/** `Article.datePublished` for the home page (beta go-live; confirmed by Brad). */
export const HOME_PUBLISHED_AT = '2026-01-15'

/** Beta launch month (YYYY-MM). */
export const BETA_LAUNCH = '2026-01'
/** Public launch month (YYYY-MM). Also `Organization.foundingDate`. */
export const PUBLIC_LAUNCH = '2026-08'

/** Announcement post date (confirmed by Brad). Keep in sync with the post frontmatter. */
export const LAUNCH_POST_DATE = '2026-09-22'
export const LAUNCH_POST_SLUG = 'dealgapiq-launches-publicly'

export const SUPPORT_EMAIL = 'support@dealgapiq.com'
/** Display form. */
export const SUPPORT_PHONE = '(866) 388-8222'
/** E.164 form for `tel:` links and schema `telephone`. */
export const SUPPORT_PHONE_E164 = '+1-866-388-8222'

export const HQ_CITY = 'Boca Raton'
export const HQ_REGION = 'FL'
export const HQ_COUNTRY = 'US'

export const FOUNDER_NAME = 'Brad Geisen'
export const FOUNDER_TITLE = 'Founder and CEO'
export const FOUNDER_BOOK = 'The Deal Gap'
/** Exact order is approved; do not reorder. */
export const FOUNDER_CREDENTIAL_LINE =
  'Founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac'
export const FOUNDER_LINKEDIN_URL = 'https://www.linkedin.com/in/bradgeisen/'
/** Amazon page for The Deal Gap, canonical form (no tracking parameters). */
export const FOUNDER_AMAZON_URL = 'https://www.amazon.com/dp/B0HF3MJPLH'
/** `Person.sameAs`. */
export const FOUNDER_SAME_AS = [FOUNDER_LINKEDIN_URL, FOUNDER_AMAZON_URL]

export const COMPANY_LINKEDIN_URL = 'https://www.linkedin.com/company/dealgapiq/'

export const IOS_APP_STORE_ID = '6759636866'
export const IOS_APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`

/** Android application id (Capacitor `appId` / `applicationId` in android/app/build.gradle). */
export const ANDROID_APPLICATION_ID = 'com.dealgapiq.mobile'
/** Canonical Play listing ("DealGapIQ: Analyze Real Estate"), no attribution params — for schema and press. */
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APPLICATION_ID}`

/** `Organization.sameAs`. Crunchbase is added once the profile exists. */
export const ORGANIZATION_SAME_AS = [IOS_APP_STORE_URL, GOOGLE_PLAY_URL, COMPANY_LINKEDIN_URL]

/** The six strategies, in the approved order. */
export const STRATEGIES = [
  { label: 'long-term rental', href: '/strategies/long-term-rental' },
  { label: 'short-term rental', href: '/strategies/short-term-rental' },
  { label: 'BRRRR', href: '/strategies/brrrr' },
  { label: 'fix and flip', href: '/strategies/fix-flip' },
  { label: 'house hack', href: '/strategies/house-hack' },
  { label: 'wholesale', href: '/strategies/wholesale' },
] as const

/** Approved worked example. */
export const WORKED_EXAMPLE = {
  address: '1014-16 N J St, Lake Worth, FL',
  listPrice: '$457,100',
  targetBuy: '$428,000',
  downPaymentPct: '20%',
  dealGap: '-6.4%',
  dealGapDollars: 'about $29,000',
} as const
