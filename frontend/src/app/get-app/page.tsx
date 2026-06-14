import type { Metadata } from 'next'
import GetAppClient from './GetAppClient'

export const metadata: Metadata = {
  title: 'Get the DealGapIQ App',
  description:
    'Download DealGapIQ for iOS and Android. Score any property in 60 seconds, see the Deal Gap, and get the price that makes the deal work — in your pocket.',
  alternates: { canonical: '/get-app' },
  openGraph: {
    title: 'Get the DealGapIQ App',
    description:
      'Score any property in 60 seconds. Download DealGapIQ for iOS and Android.',
    type: 'website',
    url: '/get-app',
    siteName: 'DealGapIQ',
  },
  robots: { index: true, follow: true },
}

export default function GetAppPage() {
  return <GetAppClient />
}
