import type { Metadata } from 'next'
import { AboutPageRedesign } from '@/components/landing/AboutPageRedesign'

const BASE = 'https://dealgapiq.com'

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${BASE}/about#brad-geisen`,
  name: 'Brad Geisen',
  givenName: 'Brad',
  familyName: 'Geisen',
  url: `${BASE}/about`,
  image: `${BASE}/brad-geisen.png`,
  jobTitle: 'Founder',
  worksFor: { '@id': `${BASE}/#organization` },
  description:
    'Founder of DealGapIQ and founder of Foreclosure.com. 35+ years of leadership across real estate, development, asset management, fintech, and technology. In 1991 awarded the first GSE contract to outsource HUD\'s property-disposition division — the first outsourcing partnership of its kind in federal agency history. Built HomePath.com for Fannie Mae (2000) and HomeSteps.com for Freddie Mac. 30+ years as a trusted technology provider to both GSEs. Has personally acquired, rehabbed, and sold over 1,000 residential properties.',
  knowsAbout: [
    'Real estate investing',
    'Foreclosure investing',
    'Distressed property acquisition',
    'Creative financing',
    'Subject-To financing',
    'Seller carryback financing',
    'Real estate disposition',
    'GSE asset management',
    'Property-disposition program design',
    'Real estate development',
    'Fintech',
  ],
  hasOccupation: [
    {
      '@type': 'Occupation',
      name: 'Founder & Manager, DealGapIQ',
    },
    {
      '@type': 'Occupation',
      name: 'Founder, Foreclosure.com',
    },
    {
      '@type': 'Occupation',
      name: 'Real estate broker, developer, and investor',
    },
  ],
  affiliation: [
    {
      '@type': 'Organization',
      name: 'Foreclosure.com',
      url: 'https://www.foreclosure.com',
    },
    {
      '@type': 'GovernmentOrganization',
      name: 'U.S. Department of Housing and Urban Development',
      url: 'https://www.hud.gov',
    },
    {
      '@type': 'Organization',
      name: 'Fannie Mae',
      url: 'https://www.fanniemae.com',
    },
    {
      '@type': 'Organization',
      name: 'Freddie Mac',
      url: 'https://www.freddiemac.com',
    },
  ],
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'Palm Beach State College',
    sameAs: 'https://en.wikipedia.org/wiki/Palm_Beach_State_College',
  },
  award: [
    'First GSE outsourcing contract in U.S. federal agency history (HUD, 1991)',
    '30+ years as a trusted technology provider to Fannie Mae and Freddie Mac',
  ],
  sameAs: [
    'https://www.linkedin.com/in/bradgeisen',
    'https://www.foreclosure.com',
    'https://www.facebook.com/brad.geisen.3',
    // TODO Brad: add Wikidata Q-item URL once created
  ],
}

export const metadata: Metadata = {
  title: 'About — DealGapIQ',
  description:
    'DealGapIQ reduces complex investment analysis into three proprietary numbers — powered by real market data, transparent assumptions, and 35 years of institutional real estate intelligence. Founded by Brad Geisen, founder of Foreclosure.com.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About — DealGapIQ',
    description:
      'Founded by Brad Geisen, founder of Foreclosure.com. The metric that changes how you evaluate deals.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About DealGapIQ',
    description: 'Founded by Brad Geisen, founder of Foreclosure.com.',
  },
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <AboutPageRedesign />
    </>
  )
}
