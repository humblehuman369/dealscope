import { HubHomepage } from '@/features/investor-intelligence/components/HubHomepage'
import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import { hubJsonLd } from '@/lib/investor-intelligence'

export const metadata = iiMetadata({
  title: 'DealGapIQ Investor Intelligence | Residential Real Estate Investor Research & Analysis',
  description:
    'Understand the market. Then understand the property. Residential real estate investor trends, market intelligence, financing analysis, and Deal Gap property math from DealGapIQ.',
  path: '/investor-intelligence',
})

export default function InvestorIntelligenceHubPage() {
  return (
    <>
      <JsonLd data={hubJsonLd()} />
      <HubHomepage />
    </>
  )
}
