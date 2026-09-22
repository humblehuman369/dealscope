import type { Metadata } from 'next'
import { Suspense } from 'react'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { BRAND_ASSETS, BRAND_OG_IMAGE } from '@/lib/brand'
import { SPEED_CLAIM } from '@/lib/claims'
import { DiscoveryExplainerVisibility } from './DiscoveryExplainerVisibility'
import { DiscoveryPageExplainer } from './DiscoveryPageExplainer'

export const metadata: Metadata = {
  title: 'Discovery — Instant Deal Score for Any Property | DealGapIQ',
  // ≤155 chars for SERP snippets; the six strategies are named in the H1 explainer below.
  description:
    `Discovery scores any single-family or small multi-family property ${SPEED_CLAIM} across six strategies and shows the Deal Gap so you know what to offer.`,
  alternates: { canonical: '/discovery' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'Discovery — Instant Deal Score for Any Property',
    description:
      `Score any property ${SPEED_CLAIM} across six investment strategies and see the Deal Gap.`,
    url: '/discovery',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discovery — Instant Deal Score for Any Property',
    description: `Score any property ${SPEED_CLAIM} across six investment strategies.`,
  },
}

const DISCOVERY_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://dealgapiq.com/discovery',
  url: 'https://dealgapiq.com/discovery',
  name: 'Discovery — Instant Deal Score',
  description:
    `Discovery scores any property ${SPEED_CLAIM} across six investment strategies and surfaces the Deal Gap.`,
  isPartOf: { '@id': 'https://dealgapiq.com/#website' },
  about: { '@id': 'https://dealgapiq.com/#software' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `https://dealgapiq.com${BRAND_ASSETS.appIcon}`,
  },
}

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DISCOVERY_JSONLD) }}
      />
      {children}
      {/* Fallback carries the same copy so the prerendered HTML has the H1 +
          explainer; the client wrapper only decides whether to hide it. */}
      <Suspense fallback={<DiscoveryPageExplainer />}>
        <DiscoveryExplainerVisibility>
          <DiscoveryPageExplainer />
        </DiscoveryExplainerVisibility>
      </Suspense>
    </>
  )
}
