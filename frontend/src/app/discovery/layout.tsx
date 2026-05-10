import type { Metadata } from 'next'
import { PageExplainer } from '@/components/seo/PageExplainer'

export const metadata: Metadata = {
  title: 'Discovery — Instant Deal Score for Any Property | DealGapIQ',
  description:
    'Discovery scores any single-family or small multi-family property in under 60 seconds — across Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale — and surfaces the Deal Gap so you know what to offer.',
  alternates: { canonical: '/discovery' },
  openGraph: {
    title: 'Discovery — Instant Deal Score for Any Property',
    description:
      'Score any property in under 60 seconds across six investment strategies and see the Deal Gap.',
    url: '/discovery',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discovery — Instant Deal Score for Any Property',
    description:
      'Score any property in under 60 seconds across six investment strategies.',
  },
}

const DISCOVERY_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://dealgapiq.com/discovery',
  url: 'https://dealgapiq.com/discovery',
  name: 'Discovery — Instant Deal Score',
  description:
    'Discovery scores any property in under 60 seconds across six investment strategies and surfaces the Deal Gap.',
  isPartOf: { '@id': 'https://dealgapiq.com/#website' },
  about: { '@id': 'https://dealgapiq.com/#software' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: 'https://dealgapiq.com/DealGapIQ_Icon_Transparent_1024.png',
  },
}

export default function DiscoveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DISCOVERY_JSONLD) }}
      />
      {children}
      <PageExplainer
        title="What is Discovery?"
        intro="Discovery is DealGapIQ's instant scoring tool for residential investment properties. Paste an address or a Zillow link and, in under 60 seconds, see whether the deal is worth pursuing — across six investment strategies, with a transparent breakdown of the numbers behind the score."
        sections={[
          {
            heading: 'What it tells you',
            body: 'A Discovery score from 0 to 95 across Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. For each strategy you see the Target Buy (the price our model says works), the Income Value (the maximum price where cash flow stays positive), and the Deal Gap (the percentage distance between the asking price and Target Buy). Discovery ranks the strategies so you know which path actually fits the property in front of you.',
          },
          {
            heading: 'How it works',
            body: 'Discovery blends data from Zillow, RentCast, Redfin, Realtor.com, and Mashvisor with our own IQ Estimate model. We pull the property facts, run the financial math for each strategy with sensible default assumptions (which you can override later in DealMaker), and surface the leverage that the asking price hides. No spreadsheet, no copy-pasting comps.',
          },
          {
            heading: 'Who it is for',
            body: 'Active residential investors who scroll listings every day and want a fast, transparent score before they spend an hour modeling a deal that does not pencil. New investors who want to learn what makes a property work. Anyone who has ever asked, "Is this a good deal — and what should I actually offer?"',
          },
        ]}
        relatedLinks={[
          { href: '/strategy', label: 'See the full Strategy breakdown' },
          { href: '/deal-maker', label: 'Open DealMaker for offer scripts' },
          { href: '/pricing', label: 'Pricing & free trial' },
          { href: '/glossary/subject-to-financing', label: 'Glossary: Subject-To financing' },
        ]}
      />
    </>
  )
}
