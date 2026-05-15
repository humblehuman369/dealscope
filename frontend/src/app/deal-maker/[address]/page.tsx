import DealMakerRoutePage from './DealMakerClient'
import { ScreenErrorBoundary } from '@/components/ErrorBoundary'

export function generateStaticParams() {
  return []
}

export default function DealMakerAddressRoute() {
  return (
    <ScreenErrorBoundary>
      <DealMakerRoutePage />
    </ScreenErrorBoundary>
  )
}
