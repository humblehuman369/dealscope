import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

process.env.NEXT_PUBLIC_API_URL = 'https://test.example.com'

const { resetPostHog } = vi.hoisted(() => ({
  resetPostHog: vi.fn(),
}))

vi.mock('@/lib/posthog', () => ({
  resetPostHog,
}))

import { getLastKnownUser, setLastKnownUser, useSession } from '@/hooks/useSession'
import type { UserResponse } from '@/lib/api-client'

const USER: UserResponse = {
  id: 'user-1',
  email: 'brad@example.com',
  full_name: 'Brad',
  avatar_url: null,
  is_active: true,
  is_verified: true,
  is_superuser: false,
  mfa_enabled: false,
  created_at: '',
  last_login: null,
  has_profile: true,
  onboarding_completed: true,
  roles: ['member'],
  permissions: [],
  subscription_tier: 'pro',
  subscription_status: 'active',
}

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSession', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    setLastKnownUser(USER)
  })

  afterEach(() => {
    vi.useRealTimers()
    setLastKnownUser(null)
    queryClient.clear()
  })

  it('preserves the session when refresh returns 500 twice', async () => {
    vi.useFakeTimers()

    fetchMock.mockImplementation(async (url: unknown) => {
      const href = String(url)
      if (href.includes('/api/v1/auth/refresh')) {
        return { ok: false, status: 500, text: async () => 'outage' }
      }
      if (href.includes('/api/v1/auth/me')) {
        return {
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: 'Unauthorized' }),
          json: async () => ({ detail: 'Unauthorized' }),
        }
      }
      return { ok: false, status: 404, text: async () => '' }
    })

    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750)
    })

    expect(getLastKnownUser()?.id).toBe('user-1')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('brad@example.com')
    expect(localStorage.removeItem).not.toHaveBeenCalled()
    expect(resetPostHog).not.toHaveBeenCalled()
  })
})
