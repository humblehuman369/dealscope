import StrategyWorksheetPage from './StrategyWorksheetClient'
import { ScreenErrorBoundary } from '@/components/ErrorBoundary'

export function generateStaticParams() {
  return []
}

export default function WorksheetStrategyRoute() {
  return (
    <ScreenErrorBoundary>
      <StrategyWorksheetPage />
    </ScreenErrorBoundary>
  )
}
