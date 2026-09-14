import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

vi.mock('@/lib/eventTracking', () => ({
  trackEvent: vi.fn(),
}))
vi.mock('@/lib/metaPixel', () => ({ newMetaEventId: () => 'evt-nav' }))
vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}))

import { VerdictCard } from '@/components/discovery/VerdictCard'
import { parseWorkflowV1View, workflowV1TabHref } from '@/lib/workflowRoutes'

const ADDRESS = '1766 Wandering Willow Way, Wellington, FL 33414'

function VerdictPlanNav() {
  const [workbenchRequest, setWorkbenchRequest] = useState<string | null>(null)
  const [href, setHref] = useState(workflowV1TabHref('discovery', ADDRESS))
  const view = parseWorkflowV1View(new URL(href, 'https://dealgapiq.com').searchParams.get('view'))
  const showPlan = Boolean(workbenchRequest) || view === 'plan'

  return (
    <div>
      <p>{showPlan ? 'Plan view' : 'Discovery view'}</p>
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence="Listed at $626K. Worth about $454K to you as a rental."
        call="worth_pursuing"
        callFired={[]}
        gap={27.5}
        signals={0}
        closes={false}
        isAuthenticated={false}
        onShowMath={vi.fn()}
        onBuildPlan={() => {
          setWorkbenchRequest(ADDRESS)
          setHref(workflowV1TabHref('plan', ADDRESS))
        }}
      />
    </div>
  )
}

describe('Build the plan', () => {
  it('opens Plan when the Verdict card button is clicked', () => {
    render(<VerdictPlanNav />)
    expect(screen.getByText('Discovery view')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Build the plan' }))
    expect(screen.getByText('Plan view')).toBeInTheDocument()
    expect(screen.queryByText('Discovery view')).not.toBeInTheDocument()
  })
})
