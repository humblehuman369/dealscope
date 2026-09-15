import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ isAuthenticated: false, isLoading: false }),
}))

vi.mock('@/hooks/useAppNavigation', () => ({
  useAppPathname: () => '/discovery',
  useAppSearchParams: () =>
    new URLSearchParams('address=7026+NW+21st+Ave%2C+Miami%2C+FL+33147&view=workbench'),
}))

import { AuthGate } from '@/components/auth/AuthGate'
import { ANON_FUNNEL_COPY } from '@/lib/anonFunnelCopy'

describe('AuthGate signed-out Plan heading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the create-account heading and Sign in secondary on the Plan tab', () => {
    render(
      <AuthGate
        mode="section"
        heading={ANON_FUNNEL_COPY.buildPlanCta}
        ctaMode="register"
        ctaLabel={ANON_FUNNEL_COPY.buildPlanCta}
        secondaryLabel={ANON_FUNNEL_COPY.signIn}
      >
        <p>Hidden plan numbers</p>
      </AuthGate>,
    )
    expect(screen.getAllByText(ANON_FUNNEL_COPY.buildPlanCta).length).toBeGreaterThanOrEqual(1)
    const register = screen.getByRole('link', { name: ANON_FUNNEL_COPY.buildPlanCta })
    expect(register.getAttribute('href')).toContain('auth=register')
    expect(register.getAttribute('href')).toContain('view=workbench')
    const signIn = screen.getByRole('link', { name: ANON_FUNNEL_COPY.signIn })
    expect(signIn.getAttribute('href')).toContain('auth=login')
  })
})
