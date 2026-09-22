import { HOME_FAQ } from '@/content/home-faq'
import { FOUNDER_NAME, HOME_H1, HOME_PUBLISHED_AT, HOME_UPDATED_AT, SITE_URL } from '@/config/site'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { toSchemaDateTime } from '@/lib/seo/dates'
import { buildFaqJsonLd } from '@/lib/seo/metadata'
import { ORG_ID, PERSON_ID, SOFTWARE_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

/**
 * Meta description for `/`, also `og:description` and `Article.description`.
 * Must stay under 155 chars (guarded by `home-schema.test.ts`). The launch
 * plan's Step 9 wording ran 162 chars; this trims two connectives and keeps
 * every fact.
 */
export const HOME_DESCRIPTION =
  "See the gap between a property's price and its investor value and four ways to close it. Six strategies, every U.S. market, under 60 seconds. Start free."

/** `<title>` of `/`, also `og:title` and `WebPage.name`. */
export const HOME_TITLE = 'DealGapIQ: Real Estate Deal Analysis and Offer Tool for Investors'

/** Canonical URL of `/` as the root layout's canonical + `og:url` emit it (no trailing slash). */
export const HOME_URL = SITE_URL

const WEBPAGE_ID = `${SITE_URL}/#webpage`
const BREADCRUMB_ID = `${SITE_URL}/#breadcrumb`

/**
 * Home page `@graph`: `WebPage` + its `BreadcrumbList`, `Article` (headline =
 * H1, dates from `site.ts`) and `FAQPage` (mapped from `home-faq.ts`, the same
 * array `FaqSection` renders). `Organization`, `Person`, `WebSite` and
 * `SoftwareApplication` are emitted once by `SiteJsonLd` in the root layout
 * and referenced here by `@id`.
 */
export function buildHomeJsonLd() {
  const { '@context': _ctx, ...faq } = buildFaqJsonLd(HOME_FAQ)
  void _ctx
  const ogImage = `${SITE_URL}${BRAND_OG_IMAGE.url}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': WEBPAGE_ID,
        url: HOME_URL,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': SOFTWARE_ID },
        primaryImageOfPage: { '@type': 'ImageObject', url: ogImage },
        breadcrumb: { '@id': BREADCRUMB_ID },
        inLanguage: 'en-US',
        datePublished: toSchemaDateTime(HOME_PUBLISHED_AT),
        dateModified: toSchemaDateTime(HOME_UPDATED_AT),
        publisher: { '@id': ORG_ID },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': BREADCRUMB_ID,
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: HOME_URL }],
      },
      {
        '@type': 'Article',
        '@id': `${SITE_URL}/#article`,
        headline: HOME_H1,
        description: HOME_DESCRIPTION,
        url: HOME_URL,
        mainEntityOfPage: HOME_URL,
        image: [ogImage],
        datePublished: toSchemaDateTime(HOME_PUBLISHED_AT),
        dateModified: toSchemaDateTime(HOME_UPDATED_AT),
        inLanguage: 'en-US',
        author: { '@type': 'Person', '@id': PERSON_ID, name: FOUNDER_NAME, url: `${SITE_URL}/about` },
        publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'DealGapIQ' },
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': SOFTWARE_ID },
      },
      { ...faq, '@id': `${SITE_URL}/#faq` },
    ],
  }
}
