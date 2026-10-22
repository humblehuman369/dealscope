import type { Metadata } from 'next'
import { BRAND_OG_IMAGE } from '@/lib/brand'
import { ComingSoonView } from './ComingSoonView'

const title = 'DealGapIQ is getting an upgrade — relaunching early 2027'
const description =
  "We're rebuilding our property data engine to deliver faster, more accurate deal analysis. Get early access and a founding-member offer when we reopen."

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'DealGapIQ',
    images: [BRAND_OG_IMAGE],
  },
}

export default function ComingSoonPage() {
  return <ComingSoonView />
}
