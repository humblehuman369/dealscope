import { BRAND_ASSETS, LEGAL_ENTITY_NAME } from '@/lib/brand'
import {
  PRO_MONTHLY_AMOUNT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_AMOUNT,
  PRO_YEARLY_PER_MONTH,
  PRO_YEARLY_PRICE,
} from '@/lib/claims'
import {
  FOUNDER_LINKEDIN_URL,
  HQ_CITY,
  HQ_COUNTRY,
  HQ_REGION,
  IOS_APP_STORE_URL,
  PUBLIC_LAUNCH,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_E164,
} from '@/config/site'
import { FOUNDER_IMAGE_PATH, ORG_ID, PERSON_ID, SOFTWARE_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

/** Spoken/typed variants of the brand SERP term (see DIRECT_RESPONSE_PLAYBOOK.md §2). */
const BRAND_ALTERNATE_NAMES = ['Deal Gap IQ', 'DealGap IQ', 'Deal Gap']

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'DealGapIQ',
      alternateName: BRAND_ALTERNATE_NAMES,
      legalName: LEGAL_ENTITY_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}${BRAND_ASSETS.appIcon}`,
        width: 1024,
        height: 1024,
      },
      description:
        'Residential real estate deal analysis platform that scores investment properties across six acquisition strategies and surfaces the Deal Gap.',
      foundingDate: PUBLIC_LAUNCH,
      address: {
        '@type': 'PostalAddress',
        addressLocality: HQ_CITY,
        addressRegion: HQ_REGION,
        addressCountry: HQ_COUNTRY,
      },
      telephone: SUPPORT_PHONE_E164,
      email: SUPPORT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: SUPPORT_PHONE_E164,
        email: SUPPORT_EMAIL,
        areaServed: 'US',
        availableLanguage: 'en',
      },
      // LinkedIn company page and Crunchbase are added once Brad supplies the URLs.
      sameAs: [IOS_APP_STORE_URL],
      founder: { '@id': PERSON_ID },
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: 'DealGapIQ',
      alternateName: BRAND_ALTERNATE_NAMES,
      publisher: { '@id': ORG_ID },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Brad Geisen',
      url: `${SITE_URL}/about`,
      image: `${SITE_URL}${FOUNDER_IMAGE_PATH}`,
      jobTitle: 'Founder and CEO',
      worksFor: { '@id': ORG_ID },
      sameAs: [FOUNDER_LINKEDIN_URL, 'https://www.foreclosure.com'],
      knowsAbout: [
        'Residential real estate investing',
        'Foreclosure markets',
        'Creative financing',
        'Subject-To acquisitions',
        'Real estate SaaS',
        'Government-sponsored enterprise real estate disposition',
      ],
      alumniOf: 'Foreclosure.com',
      description:
        'Founder of DealGapIQ. Previously founded Foreclosure.com and built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac, establishing a 30+ year technology partnership with the GSEs.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      name: 'DealGapIQ',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Real Estate Investment Analysis',
      operatingSystem: 'Web, iOS',
      description:
        'Analyzes residential investment properties across six acquisition strategies (Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, Wholesale) and surfaces the Deal Gap so investors know what to offer.',
      publisher: { '@id': ORG_ID },
      creator: { '@id': PERSON_ID },
      image: `${SITE_URL}${BRAND_ASSETS.appIcon}`,
      featureList: [
        'Discovery — instant deal score (0–95)',
        'Six-strategy analysis (LTR, STR, BRRRR, Flip, House Hack, Wholesale)',
        'Deal Gap, Target Buy, and Income Value metrics',
        'Multi-source IQ Estimate (Zillow, RentCast, Redfin, Realtor) with AirROI STR analytics',
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
          price: PRO_YEARLY_AMOUNT,
          priceCurrency: 'USD',
          category: 'subscription',
          description: `Pro plan billed annually at ${PRO_YEARLY_PRICE}/year (effective $${PRO_YEARLY_PER_MONTH}/month).`,
          eligibleRegion: { '@type': 'Country', name: 'US' },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: PRO_YEARLY_PER_MONTH,
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
          price: PRO_MONTHLY_AMOUNT,
          priceCurrency: 'USD',
          category: 'subscription',
          description: `Pro plan billed monthly at ${PRO_MONTHLY_PRICE}/month.`,
          eligibleRegion: { '@type': 'Country', name: 'US' },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: PRO_MONTHLY_AMOUNT,
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
