import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IQEstimateSelector } from '@/components/iq-verdict/IQEstimateSelector'

const sources = {
  value: { iq: 625_999, zillow: 620_000 },
  rent: { iq: 4_385, zillow: 4_345 },
}

describe('IQEstimateSelector', () => {
  it('does not write the selected rent on mount', () => {
    const onSourceChange = vi.fn()
    render(<IQEstimateSelector sources={sources} onSourceChange={onSourceChange} showHeader={false} />)
    expect(onSourceChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: /IQ Estimate estimate: \$4,385 \(selected\)/i })).toBeTruthy()
  })

  it('writes only after the user picks a source', () => {
    const onSourceChange = vi.fn()
    render(<IQEstimateSelector sources={sources} onSourceChange={onSourceChange} showHeader={false} />)
    fireEvent.click(screen.getByRole('radio', { name: /Zillow estimate: \$4,345/i }))
    expect(onSourceChange).toHaveBeenCalledTimes(1)
    expect(onSourceChange).toHaveBeenCalledWith('rent', 'zillow', 4_345)
  })
})
