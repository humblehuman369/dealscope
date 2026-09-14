import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { currentPathStep, PathStepper } from '@/components/workflow/PathStepper'

describe('currentPathStep', () => {
  it('lights Discovery for both Discovery and Math', () => {
    expect(currentPathStep('discovery')).toBe('discovery')
    expect(currentPathStep('math')).toBe('discovery')
  })

  it('lights Plan and Work from those tabs', () => {
    expect(currentPathStep('plan')).toBe('plan')
    expect(currentPathStep('work')).toBe('work')
  })
})

describe('PathStepper', () => {
  it('renders five named steps and marks the current one', () => {
    render(<PathStepper tab="plan" address="110 Crosswinds Drive, Greenacres, FL 33413" />)
    expect(screen.getByRole('navigation', { name: 'Deal path' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find' })).toHaveAttribute('href', '/map-search')
    expect(screen.getByRole('link', { name: 'Track' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link', { name: 'Discovery' })).not.toHaveAttribute('aria-current')
  })

  it('lights Discovery when the Math tab is open', () => {
    render(<PathStepper tab="math" address="1 Main St" />)
    expect(screen.getByRole('link', { name: 'Discovery' })).toHaveAttribute('aria-current', 'step')
  })
})
