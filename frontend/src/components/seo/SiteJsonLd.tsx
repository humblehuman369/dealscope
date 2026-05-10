const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

const ORG_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`
const PERSON_ID = `${SITE_URL}/about#brad-geisen`

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
