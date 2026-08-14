import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { MethodologyView } from '@/features/investor-intelligence/components/MethodologyView'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import { breadcrumbJsonLd, SITE_URL } from '@/lib/investor-intelligence'

export const metadata = iiMetadata({
  title: 'Methodology — Data First. Property Math Second. Hype Never. | DealGapIQ',
  description:
    'How DealGapIQ Investor Intelligence sources data, explains methodology differences, and translates market changes into property-level economics.',
  path: '/investor-intelligence/methodology',
})

export default function IntelligenceMethodologyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'Investor Intelligence Methodology',
        url: `${SITE_URL}/investor-intelligence/methodology`,
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Investor Intelligence', path: '/investor-intelligence' },
        { name: 'Methodology', path: '/investor-intelligence/methodology' },
      ]),
    ],
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <MethodologyView />
    </>
  )
}
