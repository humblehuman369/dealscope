'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkflowV1 } from '@/lib/workflowV1'

/**
 * Hides the Discovery explainer while Level 3 (Strategy Workbench) is open or
 * under workflow v1 (P1-7), so the page does not read as Discovery content
 * stacked under Strategy.
 *
 * Toggles `hidden` instead of unmounting so the server-rendered copy stays in
 * the DOM. `useSearchParams` makes this client-only during prerender, so the
 * layout's Suspense fallback carries the visible copy for non-JS crawlers.
 */
export function DiscoveryExplainerVisibility({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const { enabled: workflowV1 } = useWorkflowV1()
  const hidden = workflowV1 || searchParams?.get('view') === 'workbench'
  return <div hidden={hidden}>{children}</div>
}
