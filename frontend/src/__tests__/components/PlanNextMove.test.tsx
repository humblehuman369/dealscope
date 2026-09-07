import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlanNextMove } from '@/features/strategy-workbench/components/PlanNextMove'

describe('PlanNextMove', () => {
  it('asks for the trial immediately and sells the offer packet, not buyers', () => {
    const onStartTrial = vi.fn()
    const onAnalyzeAnother = vi.fn()
    render(
      <PlanNextMove
        remainingAnalyses={1}
        onStartTrial={onStartTrial}
        onAnalyzeAnother={onAnalyzeAnother}
      />,
    )
    expect(screen.getByText(/your next move on this deal/i)).toBeInTheDocument()
    expect(screen.getByText(/1 analysis left this month/i)).toBeInTheDocument()
    expect(screen.getByText(/download the offer packet/i)).toBeInTheDocument()
    expect(screen.queryByText(/cash buyers/i)).toBeNull()
    expect(screen.queryByText(/lenders/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /start 7-day pro trial/i }))
    expect(onStartTrial).toHaveBeenCalledOnce()
  })

  it('routes analyze-another to search when an analysis remains', () => {
    const onStartTrial = vi.fn()
    const onAnalyzeAnother = vi.fn()
    render(
      <PlanNextMove
        remainingAnalyses={1}
        onStartTrial={onStartTrial}
        onAnalyzeAnother={onAnalyzeAnother}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /analyze another property/i }))
    expect(onAnalyzeAnother).toHaveBeenCalledOnce()
    expect(onStartTrial).not.toHaveBeenCalled()
  })

  it('sends a zero-remaining user to the trial, not another search', () => {
    const onStartTrial = vi.fn()
    const onAnalyzeAnother = vi.fn()
    render(
      <PlanNextMove
        remainingAnalyses={0}
        onStartTrial={onStartTrial}
        onAnalyzeAnother={onAnalyzeAnother}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /upgrade for unlimited analyses/i }))
    expect(onStartTrial).toHaveBeenCalledOnce()
    expect(onAnalyzeAnother).not.toHaveBeenCalled()
  })
})
