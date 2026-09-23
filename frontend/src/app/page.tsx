import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { ScanQR } from '@/components/landing/ScanQR'
import { HOME_QR_URL } from '@/lib/scanQr'
import HomePageClient from './_components/HomePageClient'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { HOME_UPDATED_AT } from '@/config/site'
import { buildHomeJsonLd, HOME_DESCRIPTION, HOME_TITLE } from '@/lib/seo/home-schema'

const defaultTitle = HOME_TITLE
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

/**
 * No request-time input here (no `headers()` UA sniff), so `/` prerenders as
 * static HTML. The hero decides between the desktop QR block and the mobile
 * "Scan a house" button with a CSS media query at the same 768px breakpoint.
 */
export default function HomePage() {
  return (
    <>
      {/* React hoists <meta> into <head>; Next's `openGraph` has no modified_time for type=website. */}
      <meta property="article:modified_time" content={HOME_UPDATED_AT} />
      <JsonLd data={buildHomeJsonLd()} />
      <HomePageClient
        scanQr={
          <ScanQR
            src="qr_home"
            url={HOME_QR_URL}
            size={72}
            framed={false}
            alt="QR code that opens dealgapiq.com in your phone's browser."
          />
        }
      />
    </>
  )
}
