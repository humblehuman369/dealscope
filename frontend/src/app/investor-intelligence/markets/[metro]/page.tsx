import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { MarketView } from '@/features/investor-intelligence/components/MarketView'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import {
  FEATURED_MARKETS,
  breadcrumbJsonLd,
  getMarket,
  SITE_URL,
} from '@/lib/investor-intelligence'

export function generateStaticParams() {
  return FEATURED_MARKETS.map((m) => ({ metro: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metro: string }>
}): Promise<Metadata> {
  const { metro } = await params
  const market = getMarket(metro)
  if (!market) return {}
  return iiMetadata({
    title: `${market.name}, ${market.state} — Market Intelligence | DealGapIQ`,
    description: market.summary,
    path: `/investor-intelligence/markets/${market.slug}`,
  })
}

export default async function MarketPage({ params }: { params: Promise<{ metro: string }> }) {
  const { metro } = await params
  const market = getMarket(metro)
  if (!market) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: `${market.name}, ${market.state}`,
        description: market.summary,
        url: `${SITE_URL}/investor-intelligence/markets/${market.slug}`,
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Investor Intelligence', path: '/investor-intelligence' },
        { name: 'Markets', path: '/investor-intelligence/markets' },
        {
          name: `${market.name}, ${market.state}`,
          path: `/investor-intelligence/markets/${market.slug}`,
        },
      ]),
    ],
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <MarketView market={market} />
    </>
  )
}
