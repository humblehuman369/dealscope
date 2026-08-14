import '@/features/investor-intelligence/intelligence.css'
import { AuthorView } from '@/features/investor-intelligence/components/AuthorView'
import { IntelligenceFrame } from '@/features/investor-intelligence/components/IntelligenceFrame'
import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import { authorJsonLd } from '@/lib/investor-intelligence'

export const metadata = iiMetadata({
  title: 'Brad Geisen — DealGapIQ Investor Intelligence',
  description:
    'Brad Geisen, founder of DealGapIQ and Foreclosure.com. Built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. Author of DealGapIQ Investor Intelligence.',
  path: '/authors/brad-geisen',
})

export default function BradGeisenAuthorPage() {
  return (
    <IntelligenceFrame>
      <JsonLd data={authorJsonLd()} />
      <AuthorView />
    </IntelligenceFrame>
  )
}
