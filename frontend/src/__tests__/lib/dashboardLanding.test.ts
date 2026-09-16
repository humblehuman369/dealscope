import { afterEach, describe, expect, it } from 'vitest'
import { resolveHomepageLanding, shouldLandOnDashboard } from '@/lib/dashboardLanding'

describe('resolveHomepageLanding', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('prefers a pending property URL over the once-a-day dashboard hop', () => {
    expect(resolveHomepageLanding('/discovery?address=1+Oak')).toBe('/discovery?address=1+Oak')
  })

  it('rejects off-origin pending values and falls through to the dashboard hop', () => {
    expect(resolveHomepageLanding('https://evil.example/')).toBe(
      shouldLandOnDashboard() ? '/dashboard' : null,
    )
  })
})
