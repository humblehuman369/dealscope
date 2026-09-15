import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkCheckError } from '@/components/workflow/WorkCheckError'

describe('Work tab spins when saved/check fails', () => {
  it('renders the error card and Retry refetches', () => {
    const onRetry = vi.fn()
    render(<WorkCheckError onRetry={onRetry} />)
    expect(
      screen.getByRole('heading', { name: "We couldn't reach the server. Try again." }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
