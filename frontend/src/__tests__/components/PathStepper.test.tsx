import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  currentPathStep,
  isMapPathStripArrival,
  MAP_FIND_HREF,
  PathStepper,
} from '@/components/workflow/PathStepper'
import { workflowV1TabHref } from '@/lib/workflowRoutes'

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

describe('isMapPathStripArrival', () => {
  it('is true for homepage See Now and the stepper Find link', () => {
    expect(isMapPathStripArrival(new URLSearchParams('source=home_hero'))).toBe(true)
    expect(isMapPathStripArrival(new URLSearchParams('from=path'))).toBe(true)
  })

  it('is false for a plain map visit', () => {
    expect(isMapPathStripArrival(new URLSearchParams())).toBe(false)
    expect(isMapPathStripArrival(new URLSearchParams('from=deal-maker'))).toBe(false)
  })
})

describe('PathStepper', () => {
  it('renders five named steps and marks the current one', () => {
    render(<PathStepper tab="plan" address="110 Crosswinds Drive, Greenacres, FL 33413" />)
    expect(screen.getByRole('navigation', { name: 'Deal path' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find' })).toHaveAttribute('href', MAP_FIND_HREF)
    expect(screen.getByRole('link', { name: 'Track' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute(
      'href',
      workflowV1TabHref('work', '110 Crosswinds Drive, Greenacres, FL 33413'),
    )
    expect(screen.getByRole('link', { name: 'Discovery' })).toHaveAttribute(
      'href',
      workflowV1TabHref('discovery', '110 Crosswinds Drive, Greenacres, FL 33413'),
    )
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute(
      'href',
      workflowV1TabHref('plan', '110 Crosswinds Drive, Greenacres, FL 33413'),
    )
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link', { name: 'Discovery' })).not.toHaveAttribute('aria-current')
  })

  it('lights Discovery when the Math tab is open', () => {
    render(<PathStepper tab="math" address="1 Main St" />)
    expect(screen.getByRole('link', { name: 'Discovery' })).toHaveAttribute('aria-current', 'step')
  })

  it('no-property mode lights Find and does not link later steps', () => {
    render(<PathStepper />)
    expect(screen.getByRole('navigation', { name: 'Deal path' })).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('Find')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Discovery')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Plan')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Work')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Track')).not.toHaveAttribute('aria-current')
  })
})
