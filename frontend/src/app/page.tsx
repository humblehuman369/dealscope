import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/JsonLd'
import { ScanQR } from '@/components/landing/ScanQR'
import HomePageClient from './_components/HomePageClient'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { HOME_UPDATED_AT } from '@/config/site'
import { buildHomeJsonLd, HOME_DESCRIPTION } from '@/lib/seo/home-schema'
import { isMobileUserAgent } from '@/lib/scanQr'

const defaultTitle = 'DealGapIQ: Real Estate Deal Analysis and Offer Tool for Investors'
const defaultDescription = HOME_DESCRIPTION

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: 'website',
    url: '/',
    siteName: 'DealGapIQ',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: { index: true, follow: true },
}

export default async function HomePage() {
  // UA sniff keeps the QR block out of phone markup, but it also makes `/`
  // dynamic (served `no-store`). Making the home page static needs a
  // client/CSS-driven QR decision; tracked in the GEO launch PR.
  const ua = (await headers()).get('user-agent') ?? ''
  const scanQr = isMobileUserAgent(ua) ? undefined : (
    <ScanQR src="qr_home" size={72} framed={false} />
  )

  return (
    <>
      {/* React hoists <meta> into <head>; Next's `openGraph` has no modified_time for type=website. */}
      <meta property="article:modified_time" content={HOME_UPDATED_AT} />
      <JsonLd data={buildHomeJsonLd()} />
      <HomePageClient scanQr={scanQr} />
    </>
  )
}
