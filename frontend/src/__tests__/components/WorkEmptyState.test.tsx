import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkEmptyState } from '@/components/workflow/WorkEmptyState'

describe('WorkEmptyState', () => {
  it('shows the locked copy and the Go to the plan button', () => {
    const onGoToPlan = vi.fn()
    render(<WorkEmptyState onGoToPlan={onGoToPlan} />)
    expect(screen.getByRole('heading', { name: 'No deal yet' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'This house is not in your pipeline. Build the plan, then start working it. The checklist, the people, and your next move fill in from the plan.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to the plan' }))
    expect(onGoToPlan).toHaveBeenCalledTimes(1)
  })
})
