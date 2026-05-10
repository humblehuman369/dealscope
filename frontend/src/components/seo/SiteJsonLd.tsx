const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

const ORG_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`
const PERSON_ID = `${SITE_URL}/about#brad-geisen`
const SOFTWARE_ID = `${SITE_URL}/#software`

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'DealGapIQ',
      legalName: 'DealGapIQ LLC',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/DealGapIQ_Icon_Transparent_1024.png`,
        width: 1024,
        height: 1024,
      },
      description:
        'Residential real estate deal analysis platform that scores investment properties across six acquisition strategies and surfaces the Deal Gap.',
      founder: { '@id': PERSON_ID },
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: 'DealGapIQ',
      publisher: { '@id': ORG_ID },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Brad Geisen',
      url: `${SITE_URL}/about`,
      image: `${SITE_URL}/brad-geisen.png`,
      jobTitle: 'Founder',
      worksFor: { '@id': ORG_ID },
      knowsAbout: [
        'Residential real estate investing',
        'Foreclosure markets',
        'Creative financing',
        'Subject-To acquisitions',
        'Real estate SaaS',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      name: 'DealGapIQ',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Real Estate Investment Analysis',
      operatingSystem: 'Web, iOS, Android',
      description:
        'Analyzes residential investment properties across six acquisition strategies (Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, Wholesale) and surfaces the Deal Gap so investors know what to offer.',
      publisher: { '@id': ORG_ID },
      creator: { '@id': PERSON_ID },
      image: `${SITE_URL}/DealGapIQ_Icon_Transparent_1024.png`,
      featureList: [
        'IQ Verdict — instant deal score (0–95)',
        'Six-strategy analysis (LTR, STR, BRRRR, Flip, House Hack, Wholesale)',
        'Deal Gap, Target Buy, and Income Value metrics',
        'Multi-source IQ Estimate (Zillow, RentCast, Redfin, Realtor, Mashvisor)',
        'Editable assumptions and stress-testing',
        'Creative-finance modeling (Subject-To, seller carrybacks, 0% seconds)',
        'Four pre-built offer structures with negotiation scripts',
        'PDF and Excel exports',
        '10-year financial projections',
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '0',
          priceCurrency: 'USD',
          category: 'Free',
          eligibleRegion: { '@type': 'Country', name: 'US' },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
        },
        {
          '@type': 'Offer',
          name: 'Pro (Annual)',
          price: '349.99',
          priceCurrency: 'USD',
          category: 'subscription',
          description:
            'Pro plan billed annually at $349.99/year (effective $29.17/month).',
          eligibleRegion: { '@type': 'Country', name: 'US' },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '29.17',
            priceCurrency: 'USD',
            unitText: 'MONTH',
            referenceQuantity: {
              '@type': 'QuantitativeValue',
              value: 1,
              unitCode: 'MON',
            },
          },
        },
        {
          '@type': 'Offer',
          name: 'Pro (Monthly)',
          price: '39.99',
          priceCurrency: 'USD',
          category: 'subscription',
          description: 'Pro plan billed monthly at $39.99/month.',
          eligibleRegion: { '@type': 'Country', name: 'US' },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '39.99',
            priceCurrency: 'USD',
            unitText: 'MONTH',
            referenceQuantity: {
              '@type': 'QuantitativeValue',
              value: 1,
              unitCode: 'MON',
            },
          },
        },
      ],
    },
  ],
}

export function SiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
