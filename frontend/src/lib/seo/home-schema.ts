import { HOME_FAQ } from '@/content/home-faq'
import { FOUNDER_NAME, HOME_H1, HOME_PUBLISHED_AT, HOME_UPDATED_AT, SITE_URL } from '@/config/site'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { buildFaqJsonLd } from '@/lib/seo/metadata'
import { ORG_ID, PERSON_ID, SOFTWARE_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

/** Meta description for `/`, also reused as `Article.description`. Keep under 155 chars. */
export const HOME_DESCRIPTION =
  "See the gap between a property's price and its investor value, then get four ways to close it. Six strategies, every U.S. market, under 60 seconds. Free to start."

/**
 * Home page `@graph`: `Article` (headline = H1, dates from `site.ts`) and
 * `FAQPage` (mapped from `home-faq.ts`, the same array `FaqSection` renders).
 * `Organization`, `Person`, `WebSite` and `SoftwareApplication` are emitted
 * once by `SiteJsonLd` in the root layout and referenced here by `@id`.
 */
export function buildHomeJsonLd() {
  const { '@context': _ctx, ...faq } = buildFaqJsonLd(HOME_FAQ)
  void _ctx

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${SITE_URL}/#article`,
        headline: HOME_H1,
        description: HOME_DESCRIPTION,
        url: `${SITE_URL}/`,
        mainEntityOfPage: `${SITE_URL}/`,
        image: [`${SITE_URL}${BRAND_OG_IMAGE.url}`],
        datePublished: HOME_PUBLISHED_AT,
        dateModified: HOME_UPDATED_AT,
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
