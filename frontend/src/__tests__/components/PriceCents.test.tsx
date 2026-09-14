import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PriceCents } from '@/components/ui/PriceCents'
import { PRO_YEARLY_PER_MONTH } from '@/lib/claims'

describe('PriceCents', () => {
  it('keeps the decimal point so yearly-per-month never concatenates', () => {
    const { container } = render(<PriceCents>{`$${PRO_YEARLY_PER_MONTH}`}</PriceCents>)
    expect(container.textContent).toBe(`$${PRO_YEARLY_PER_MONTH}`)
    expect(container.textContent).not.toContain(PRO_YEARLY_PER_MONTH.replace('.', ''))
  })

  it('renders cents as a superscript span', () => {
    const { container } = render(<PriceCents>{PRO_YEARLY_PER_MONTH}</PriceCents>)
    const sup = container.querySelector('span')
    const cents = PRO_YEARLY_PER_MONTH.split('.')[1]
    expect(sup?.textContent).toBe(cents)
    expect(container.textContent).toBe(PRO_YEARLY_PER_MONTH)
  })

  it('passes through strings without a decimal point', () => {
    const { container } = render(<PriceCents>Free</PriceCents>)
    expect(container.textContent).toBe('Free')
    expect(container.querySelector('span')).toBeNull()
  })
})
