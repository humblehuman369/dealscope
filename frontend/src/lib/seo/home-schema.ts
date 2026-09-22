import { HOME_FAQ } from '@/content/home-faq'
import { DEAL_GAP_DEFINITION, HOME_FACTS, HOME_FACTS_CAPTION, HOME_FACTS_NAME } from '@/content/home-facts'
import { HOME_HOWTO_DESCRIPTION, HOME_HOWTO_NAME, HOME_HOWTO_STEPS } from '@/content/home-howto'
import { FOUNDER_NAME, HOME_H1, HOME_PUBLISHED_AT, HOME_UPDATED_AT, SITE_URL } from '@/config/site'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { toSchemaDateTime } from '@/lib/seo/dates'
import { buildFaqJsonLd, buildHowToJsonLd } from '@/lib/seo/metadata'
import { ORG_ID, PERSON_ID, SOFTWARE_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

/**
 * Meta description for `/`, also `og:description` and `Article.description`.
 * Must stay under 155 chars (guarded by `home-schema.test.ts`). The launch
 * plan's Step 9 wording ran 176 chars; this keeps every fact and the approved
 * "four paths plus a Blend" phrase at 152.
 */
export const HOME_DESCRIPTION =
  "See a property's deal gap (price vs. investor value) and four paths plus a Blend to close it. Six strategies, every U.S. market, under 60 seconds. Free."

/** `<title>` of `/`, also `og:title` and `WebPage.name`. */
export const HOME_TITLE = 'DealGapIQ: Real Estate Deal Analysis and Offer Tool for Investors'

/** Canonical URL of `/` as the root layout's canonical + `og:url` emit it (no trailing slash). */
export const HOME_URL = SITE_URL

const WEBPAGE_ID = `${SITE_URL}/#webpage`
const BREADCRUMB_ID = `${SITE_URL}/#breadcrumb`

/**
 * Home page `@graph`: `WebPage` + its `BreadcrumbList`, `Article` (headline =
 * H1, dates from `site.ts`), `FAQPage` (mapped from `home-faq.ts`, the same
 * array `FaqSection` renders), `HowTo`, `DefinedTerm` (deal gap) and
 * `Dataset` (first-party facts table). `Organization`, `Person`, `WebSite`
 * and `SoftwareApplication` are emitted once by `SiteJsonLd` in the root
 * layout and referenced here by `@id`.
 */
export function buildHomeJsonLd() {
  const { '@context': _ctx, ...faq } = buildFaqJsonLd(HOME_FAQ)
  void _ctx
  const { '@context': _howToCtx, ...howTo } = buildHowToJsonLd({
    name: HOME_HOWTO_NAME,
    description: HOME_HOWTO_DESCRIPTION,
    url: HOME_URL,
    steps: HOME_HOWTO_STEPS.map((step) => ({ name: step.name, text: step.text })),
  })
  void _howToCtx
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
      { ...howTo, '@id': `${SITE_URL}/#howto` },
      {
        '@type': 'DefinedTerm',
        '@id': `${SITE_URL}/#deal-gap`,
        name: 'deal gap',
        description: DEAL_GAP_DEFINITION,
        url: `${SITE_URL}/#deal-gap`,
        inDefinedTermSet: HOME_URL,
      },
      {
        '@type': 'Dataset',
        '@id': `${SITE_URL}/#home-facts`,
        name: HOME_FACTS_NAME,
        description: HOME_FACTS_CAPTION,
        url: `${HOME_URL}/#home-facts`,
        dateModified: toSchemaDateTime(HOME_UPDATED_AT),
        creator: { '@id': PERSON_ID },
        publisher: { '@id': ORG_ID },
        isPartOf: { '@id': WEBPAGE_ID },
        variableMeasured: HOME_FACTS.map((row) => row.label),
      },
    ],
  }
}
