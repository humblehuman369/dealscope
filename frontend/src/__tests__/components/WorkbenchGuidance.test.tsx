import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WorkbenchGuidance } from '@/features/strategy-workbench/components/WorkbenchGuidance'

describe('WorkbenchGuidance', () => {
  it('tells a plan visitor their structure is loaded, not to sign in', () => {
    render(
      <WorkbenchGuidance
        dealGapPct={12}
        optionCount={3}
        isAuthenticated={false}
        fromPlan
        planLabel="Price"
      />,
    )
    expect(screen.getByText('Your plan is loaded')).toBeInTheDocument()
    expect(screen.getByText('Price — tune it here')).toBeInTheDocument()
    expect(screen.queryByText(/sign in free/i)).toBeNull()
  })

  it('still asks anonymous cold visitors to sign in', () => {
    render(<WorkbenchGuidance dealGapPct={12} optionCount={3} isAuthenticated={false} />)
    expect(screen.getByText(/sign in free to apply an option/i)).toBeInTheDocument()
  })
})
