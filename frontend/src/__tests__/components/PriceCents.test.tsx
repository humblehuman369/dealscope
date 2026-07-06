import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PriceCents } from '@/components/ui/PriceCents'

describe('PriceCents', () => {
  it('keeps the decimal point so $29.17 never reads as $2917 (billing decimal bug)', () => {
    const { container } = render(<PriceCents>$29.17</PriceCents>)
    expect(container.textContent).toBe('$29.17')
    expect(container.textContent).not.toContain('2917')
  })

  it('renders cents as a superscript span', () => {
    const { container } = render(<PriceCents>29.17</PriceCents>)
    const sup = container.querySelector('span')
    expect(sup?.textContent).toBe('17')
    expect(container.textContent).toBe('29.17')
  })

  it('passes through strings without a decimal point', () => {
    const { container } = render(<PriceCents>Free</PriceCents>)
    expect(container.textContent).toBe('Free')
    expect(container.querySelector('span')).toBeNull()
  })
})
