import WorksheetRedirect from './WorksheetRedirect'
import { ScreenErrorBoundary } from '@/components/ErrorBoundary'

export function generateStaticParams() {
  return []
}

export default function WorksheetIdRoute() {
  return (
    <ScreenErrorBoundary>
      <WorksheetRedirect />
    </ScreenErrorBoundary>
  )
}
