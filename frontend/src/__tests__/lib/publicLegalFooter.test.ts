import { describe, it, expect } from 'vitest'
import { shouldShowPublicLegalFooter } from '@/lib/publicLegalFooter'

describe('shouldShowPublicLegalFooter', () => {
  it('shows on public content routes that have no page-level copyright', () => {
    expect(shouldShowPublicLegalFooter('/blog')).toBe(true)
    expect(shouldShowPublicLegalFooter('/blog/some-post')).toBe(true)
    expect(shouldShowPublicLegalFooter('/markets')).toBe(true)
    expect(shouldShowPublicLegalFooter('/markets/florida')).toBe(true)
    expect(shouldShowPublicLegalFooter('/glossary')).toBe(true)
    expect(shouldShowPublicLegalFooter('/methodology')).toBe(true)
    expect(shouldShowPublicLegalFooter('/disclosures')).toBe(true)
    expect(shouldShowPublicLegalFooter('/legal')).toBe(true)
    expect(shouldShowPublicLegalFooter('/investor-intelligence')).toBe(true)
    expect(shouldShowPublicLegalFooter('/')).toBe(true)
  })

  it('hides on product and account routes', () => {
    expect(shouldShowPublicLegalFooter('/discovery')).toBe(false)
    expect(shouldShowPublicLegalFooter('/discovery/foo')).toBe(false)
    expect(shouldShowPublicLegalFooter('/dashboard')).toBe(false)
    expect(shouldShowPublicLegalFooter('/directory')).toBe(false)
    expect(shouldShowPublicLegalFooter('/search')).toBe(false)
  })

  it('hides where a page already prints the legal entity copyright', () => {
    expect(shouldShowPublicLegalFooter('/privacy')).toBe(false)
    expect(shouldShowPublicLegalFooter('/terms')).toBe(false)
    expect(shouldShowPublicLegalFooter('/about')).toBe(false)
    expect(shouldShowPublicLegalFooter('/strategies/brrrr')).toBe(false)
  })
})
