import type { Metadata } from 'next'
import { PageExplainer } from '@/components/seo/PageExplainer'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Deal Maker — Editable Assumptions & Offer Scripts | DealGapIQ',
  // ≤155 chars for SERP snippets.
  description:
    'Deal Maker stress-tests any property: edit assumptions, model Subject-To, seller carrybacks and 0% seconds, and generate ready-to-send offer scripts.',
  alternates: { canonical: '/deal-maker' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'Deal Maker — Editable Assumptions & Offer Scripts',
    description:
      'Stress-test assumptions, model creative finance, and generate offer scripts for any property.',
    url: '/deal-maker',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deal Maker — Editable Assumptions & Offer Scripts',
    description:
      'Stress-test assumptions, model creative finance, and generate offer scripts for any property.',
  },
}

const DEALMAKER_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://dealgapiq.com/deal-maker',
  url: 'https://dealgapiq.com/deal-maker',
  name: 'Deal Maker — Editable Assumptions & Offer Scripts',
  description:
    'Edit assumptions, model creative finance, and generate offer scripts for any property.',
  isPartOf: { '@id': 'https://dealgapiq.com/#website' },
  about: { '@id': 'https://dealgapiq.com/#software' },
}

export default function DealMakerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DEALMAKER_JSONLD) }}
      />
      {children}
      <PageExplainer
        title="What is Deal Maker?"
        intro="Deal Maker is where Discovery turns into a real offer. Every assumption that drives the score — purchase price, rent, vacancy, rehab, financing, exit — is editable, so you can stress-test the deal and structure an offer that actually closes."
        sections={[
          {
            heading: 'Four paths plus a Blend',
            body: 'For every property, Deal Maker generates four paths plus a Blend: Price, Income, Terms and Equity, and a Blend that combines them. Each path is sized to the property and ranked by expected return, so you can pick the one that matches the seller you are talking to.',
          },
          {
            heading: 'Creative-finance modeling',
            body: "Subject-To, seller carrybacks, 0% seconds, and the Morby Method are first-class structures in Deal Maker — not footnotes. Plug in the seller's loan balance and rate and we model the full P&L, the cash-to-close difference, and the risk profile.",
          },
          {
            heading: 'Negotiation scripts',
            body: 'Every offer comes with ready-to-send language: opener, value frame, structure pitch, and objection handlers. Copy-paste into your CRM, your text thread, or your in-person conversation. The scripts adapt to the structure you chose and the seller motivation indicator.',
          },
        ]}
        relatedLinks={[
          { href: '/discovery', label: 'Start with Discovery' },
          { href: '/discovery', label: 'See the full Strategy breakdown in Discovery' },
          { href: '/glossary/subject-to-financing', label: 'Glossary: Subject-To' },
          { href: '/pricing', label: 'Pricing & free trial' },
        ]}
      />
    </>
  )
}
