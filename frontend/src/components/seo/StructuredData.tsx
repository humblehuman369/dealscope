/**
 * Server-rendered JSON-LD structured data.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) do not execute JavaScript.
 * Schema MUST render in the initial HTML response. This component is a Server Component
 * (no 'use client') and renders inline <script type="application/ld+json"> tags.
 *
 * Validate at https://validator.schema.org/ and https://search.google.com/test/rich-results
 * after deploy.
 */

const BASE = 'https://dealgapiq.com'

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE}/#organization`,
  name: 'DealGapIQ',
  legalName: 'DealGapIQ LLC',
  url: BASE,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/DealGapIQ_Icon_Transparent_1024.png`,
    width: 1024,
    height: 1024,
  },
  description:
    'DealGapIQ is a real-estate investment analytics platform founded by Brad Geisen, founder of Foreclosure.com. It scores any U.S. residential listing across six investment strategies (LTR, STR, BRRRR, Fix & Flip, House Hacking, Wholesale) and four closing paths (cash, conventional, subject-to, seller-finance) and tells investors the maximum offer for each.',
  foundingDate: '2025',
  founder: { '@id': `${BASE}/about#brad-geisen` },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  knowsAbout: [
    'Real estate investment analysis',
    'Creative financing',
    'Subject-To financing',
    'Seller financing',
    'Deal structuring',
    'Foreclosure investing',
    'BRRRR',
    'Fix and flip',
    'Short-term rental analysis',
    'House hacking',
  ],
  sameAs: [
    'https://www.linkedin.com/company/111962234/',
    'https://www.youtube.com/channel/UCpmz8af1CqO6XYIIffshKzQ',
    'https://x.com/dealgapiq',
    'https://www.facebook.com/profile.php?id=61588805535168',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${BASE}/help`,
  },
}

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: BASE,
  name: 'DealGapIQ',
  publisher: { '@id': `${BASE}/#organization` },
  inLanguage: 'en-US',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const softwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${BASE}/#software`,
  name: 'DealGapIQ',
  url: BASE,
  applicationCategory: 'FinanceApplication',
  applicationSubCategory: 'Real Estate Investment Analytics',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Real estate deal analyzer that produces an IQ Verdict, Deal Gap calculation, and four creative-financing offer structures for any U.S. property.',
  publisher: { '@id': `${BASE}/#organization` },
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '0',
      priceCurrency: 'USD',
      description:
        '3 analyses per month, IQ Verdict with deal score, 6 strategy snapshots, and up to 3 saved properties.',
      availability: 'https://schema.org/InStock',
      url: `${BASE}/pricing`,
    },
    {
      '@type': 'Offer',
      name: 'Pro Investor',
      price: '29.17',
      priceCurrency: 'USD',
      description:
        'Unlimited analyses, full breakdowns, editable assumptions, appraiser tool, market consensus, sensitivity analysis, map search, 10-year projections, Excel/PDF exports.',
      availability: 'https://schema.org/InStock',
      url: `${BASE}/pricing`,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '349.99',
        priceCurrency: 'USD',
        billingDuration: 'P1Y',
        unitText: 'YEAR',
      },
    },
  ],
  featureList: [
    'IQ Verdict — deal scoring',
    'Deal Gap calculation',
    'Four-path offer structure generator',
    'Six investment strategy analyses (LTR, STR, BRRRR, Fix & Flip, House Hacking, Wholesale)',
    '10-year cash flow projection',
    'Sensitivity analysis',
    'Excel and PDF export',
  ],
}

export function SiteStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
    </>
  )
}
