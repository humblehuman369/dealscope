import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ScanQR } from '@/components/landing/ScanQR'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { SPEED_CLAIM } from '@/lib/claims'
import { isMobileUserAgent } from '@/lib/scanQr'
import ScanClient from './ScanClient'

export const metadata: Metadata = {
  title: 'Scan a house',
  description: `Point your phone at any house and get the verdict ${SPEED_CLAIM}.`,
  alternates: { canonical: '/scan' },
  openGraph: {
    title: 'Scan a house | DealGapIQ',
    description: `Point your phone at any house and get the verdict ${SPEED_CLAIM}.`,
    type: 'website',
    url: '/scan',
    siteName: 'DealGapIQ',
    images: [BRAND_OG_IMAGE],
  },
  robots: { index: true, follow: true },
}

export default async function ScanPage() {
  const ua = (await headers()).get('user-agent') ?? ''
  const prefersCamera = isMobileUserAgent(ua)
  const qr = <ScanQR src="qr_home" />

  return <ScanClient prefersCamera={prefersCamera} qr={qr} />
}
