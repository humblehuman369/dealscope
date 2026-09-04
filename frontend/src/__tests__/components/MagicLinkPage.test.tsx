import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const replace = vi.fn()
let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/auth/magic',
  useSearchParams: () => params,
}))
vi.mock('@/hooks/useAppNavigation', () => ({ useAppSearchParams: () => params }))

const consumeMagicLink = vi.fn()
vi.mock('@/lib/api/plans', () => ({ consumeMagicLink: (...args: unknown[]) => consumeMagicLink(...args) }))

const me = vi.fn()
const setMemoryToken = vi.fn()
vi.mock('@/lib/api-client', () => ({
  authApi: { me: () => me() },
  setMemoryToken: (...args: unknown[]) => setMemoryToken(...args),
}))

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))
vi.mock('@/lib/env', () => ({ IS_CAPACITOR: false }))

import MagicLinkPage from '@/app/auth/magic/page'

function renderPage() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <MagicLinkPage />
    </QueryClientProvider>,
  )
}

describe('/auth/magic', () => {
  beforeEach(() => {
    replace.mockClear()
    consumeMagicLink.mockReset()
    me.mockReset()
    setMemoryToken.mockClear()
    trackEvent.mockClear()
  })

  it('consumes the token, refreshes the session, and follows the backend redirect', async () => {
    params = new URLSearchParams({ token: 'abc123', next: '/discovery?propertyId=1' })
    consumeMagicLink.mockResolvedValue({
      redirect: '/discovery?propertyId=1&view=workbench',
      access_token: 'jwt-access',
      refresh_token: 'jwt-refresh',
    })
    me.mockResolvedValue({ id: 'u1', email: 'a@b.co' })

    renderPage()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/discovery?propertyId=1&view=workbench'))
    expect(consumeMagicLink).toHaveBeenCalledWith('abc123', '/discovery?propertyId=1')
    expect(setMemoryToken).toHaveBeenCalledWith('jwt-access', 'jwt-refresh')
    expect(trackEvent).toHaveBeenCalledWith('magic_link_consumed')
  })

  it('refuses to follow an off-origin redirect', async () => {
    params = new URLSearchParams({ token: 'abc123' })
    consumeMagicLink.mockResolvedValue({ redirect: 'https://evil.example/phish' })
    me.mockResolvedValue(null)

    renderPage()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/discovery'))
  })

  it('shows the expired-link state on a 400 and never redirects', async () => {
    params = new URLSearchParams({ token: 'stale' })
    consumeMagicLink.mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }))

    renderPage()

    expect(await screen.findByText(/expired or was already used/i)).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('explains a missing token without calling the API', async () => {
    params = new URLSearchParams()
    renderPage()
    expect(await screen.findByText(/missing its token/i)).toBeInTheDocument()
    expect(consumeMagicLink).not.toHaveBeenCalled()
  })
})
