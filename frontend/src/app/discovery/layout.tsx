import type { Metadata } from 'next'
import { Suspense } from 'react'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { BRAND_ASSETS, BRAND_OG_IMAGE } from '@/lib/brand'
import { DiscoveryPageExplainer } from './DiscoveryPageExplainer'

export const metadata: Metadata = {
  title: 'Discovery — Instant Deal Score for Any Property | DealGapIQ',
  description:
    'Discovery scores any single-family or small multi-family property in under 60 seconds — across Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale — and surfaces the Deal Gap so you know what to offer.',
  alternates: { canonical: '/discovery' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'Discovery — Instant Deal Score for Any Property',
    description:
      'Score any property in under 60 seconds across six investment strategies and see the Deal Gap.',
    url: '/discovery',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discovery — Instant Deal Score for Any Property',
    description: 'Score any property in under 60 seconds across six investment strategies.',
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
      <Suspense fallback={null}>
        <DiscoveryPageExplainer />
      </Suspense>
    </>
  )
}
