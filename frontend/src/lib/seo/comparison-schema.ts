import type { ComparisonPageConfig } from '@/components/comparisons/ComparisonPage'
import { FOUNDER_NAME, SITE_URL } from '@/config/site'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { toSchemaDateTime } from '@/lib/seo/dates'
import { buildFaqJsonLd } from '@/lib/seo/metadata'
import { ORG_ID, PERSON_ID, SOFTWARE_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

/**
 * `@graph` for one `/comparisons/*` page: `Article` (headline = H1, dates from
 * the config), `FAQPage` (the same array the page renders) and a
 * `BreadcrumbList`. `Organization`, `Person`, `WebSite` and
 * `SoftwareApplication` come from `SiteJsonLd` and are referenced by `@id`.
 */
export function buildComparisonJsonLd(config: ComparisonPageConfig) {
  const url = `${SITE_URL}/comparisons/${config.slug}`
  const ogImage = `${SITE_URL}${BRAND_OG_IMAGE.url}`
  const { '@context': _ctx, ...faq } = buildFaqJsonLd(config.faq)
  void _ctx
  const description = typeof config.metadata.description === 'string' ? config.metadata.description : config.lede

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: config.headline,
        description,
        url,
        mainEntityOfPage: url,
        image: [ogImage],
        datePublished: toSchemaDateTime(config.datePublished),
        dateModified: toSchemaDateTime(config.dateModified),
        inLanguage: 'en-US',
        author: { '@type': 'Person', '@id': PERSON_ID, name: FOUNDER_NAME, url: `${SITE_URL}/about` },
        publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'DealGapIQ' },
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': SOFTWARE_ID },
      },
      { ...faq, '@id': `${url}#faq` },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: config.headline, item: url },
        ],
      },
    ],
  }
}
