import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const replace = vi.fn()
let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/verify-email',
  useSearchParams: () => params,
}))
vi.mock('@/hooks/useAppNavigation', () => ({ useAppSearchParams: () => params }))

const verifyEmail = vi.fn()
const me = vi.fn()
const setMemoryToken = vi.fn()
vi.mock('@/lib/api-client', () => ({
  authApi: { me: () => me(), verifyEmail: (...args: unknown[]) => verifyEmail(...args) },
  setMemoryToken: (...args: unknown[]) => setMemoryToken(...args),
}))

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))

import VerifyEmailPage from '@/app/verify-email/page'

function renderPage() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <VerifyEmailPage />
    </QueryClientProvider>,
  )
}

describe('/verify-email', () => {
  beforeEach(() => {
    replace.mockClear()
    verifyEmail.mockReset()
    me.mockReset()
    setMemoryToken.mockClear()
    trackEvent.mockClear()
    sessionStorage.clear()
  })

  it('routes through when this tab asked for the email', async () => {
    sessionStorage.setItem('dealgapiq-auth-waiting', '1')
    params = new URLSearchParams({ token: 'abc123', next: '/search' })
    verifyEmail.mockResolvedValue({
      redirect: '/onboarding',
      access_token: 'jwt-access',
      refresh_token: 'jwt-refresh',
    })
    me.mockResolvedValue({ id: 'u1', email: 'a@b.co' })

    renderPage()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'))
    expect(verifyEmail).toHaveBeenCalledWith('abc123', '/search')
  })

  it('shows the signed-in card when the link opened in another tab', async () => {
    params = new URLSearchParams({ token: 'abc123' })
    verifyEmail.mockResolvedValue({
      redirect: '/onboarding',
      access_token: 'jwt-access',
      refresh_token: 'jwt-refresh',
    })
    me.mockResolvedValue({ id: 'u1', email: 'a@b.co' })

    renderPage()

    expect(await screen.findByText("You're signed in")).toBeInTheDocument()
    expect(screen.getByText(/close this tab/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue here/i })).toHaveAttribute(
      'href',
      '/onboarding',
    )
    expect(replace).not.toHaveBeenCalled()
  })
})
