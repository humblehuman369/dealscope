import type { Metadata } from 'next'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import { BRAND_ASSETS, BRAND_OG_IMAGE } from '@/lib/brand'
import {
  PRO_MONTHLY_AMOUNT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_AMOUNT,
  PRO_YEARLY_PER_MONTH,
  PRO_YEARLY_PRICE,
  SPEED_CLAIM,
} from '@/lib/claims'
import PricingContent from './PricingContent'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description:
    `Know your number before you make the offer. DealGapIQ pricing: Starter free forever, Pro from $${PRO_YEARLY_PER_MONTH}/mo (annual) or ${PRO_MONTHLY_PRICE}/mo with a 7-day free trial.`,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — DealGapIQ',
    description:
      `DealGapIQ pricing: Starter (free) and Pro from $${PRO_YEARLY_PER_MONTH}/mo with a 7-day free trial.`,
    url: '/pricing',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — DealGapIQ',
    description:
      `DealGapIQ pricing: Starter (free) and Pro from $${PRO_YEARLY_PER_MONTH}/mo with a 7-day free trial.`,
  },
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

const PRICING_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      '@id': `${SITE_URL}/pricing#product`,
      name: 'DealGapIQ',
      description:
        `Residential real estate deal analysis platform. Score any property ${SPEED_CLAIM} across six investment strategies, see the Deal Gap, and generate offer scripts.`,
      url: `${SITE_URL}/pricing`,
      image: `${SITE_URL}${BRAND_ASSETS.appIcon}`,
      brand: { '@id': `${SITE_URL}/#organization` },
      category: 'Real Estate Investment Software',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '0',
        highPrice: PRO_YEARLY_AMOUNT,
        offerCount: 3,
        offers: [
          {
            '@type': 'Offer',
            '@id': `${SITE_URL}/pricing#starter`,
            name: 'Starter',
            description:
              'Free plan: property search, 2 property analyses per month, Discovery with deal score, all 6 strategy snapshots, save up to 10 properties.',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'Free',
            url: `${SITE_URL}/pricing`,
          },
          {
            '@type': 'Offer',
            '@id': `${SITE_URL}/pricing#pro-annual`,
            name: 'Pro (Annual)',
            description:
              `Pro plan billed annually at ${PRO_YEARLY_PRICE}/year (effective $${PRO_YEARLY_PER_MONTH}/month). Includes unlimited analyses, full calculation breakdown, editable assumptions, sensitivity analysis, Deal Maker, Excel/PDF exports, and 10-year projections.`,
            price: PRO_YEARLY_AMOUNT,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'subscription',
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
              billingDuration: 'P1Y',
            },
          },
          {
            '@type': 'Offer',
            '@id': `${SITE_URL}/pricing#pro-monthly`,
            name: 'Pro (Monthly)',
            description:
              `Pro plan billed monthly at ${PRO_MONTHLY_PRICE}/month with 7-day free trial. Same features as Pro Annual.`,
            price: PRO_MONTHLY_AMOUNT,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'subscription',
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
              billingDuration: 'P1M',
            },
          },
        ],
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Pricing',
          item: `${SITE_URL}/pricing`,
        },
      ],
    },
  ],
}

const PRICING_FAQ = [
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. Starter is free forever with property search, 2 analyses per month, Discovery scores, and snapshots across all six strategies.',
  },
  {
    question: 'What does Pro include?',
    answer:
      'Pro unlocks unlimited analyses, full calculation breakdowns, editable assumptions, sensitivity analysis, DealMaker offer scripts, Excel and PDF exports, and 10-year projections.',
  },
  {
    question: 'Is there a free trial for Pro?',
    answer:
      `Yes. Pro monthly includes a 7-day free trial. Annual billing is ${PRO_YEARLY_PRICE}/year (about $${PRO_YEARLY_PER_MONTH}/month).`,
  },
]

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_JSONLD) }}
      />
      <FaqJsonLd items={PRICING_FAQ} />
      <PricingContent />
    </>
  )
}
