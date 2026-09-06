import { beforeEach, describe, expect, it, vi } from 'vitest'

const setMemoryToken = vi.fn()
const setLastKnownUser = vi.fn()
const setLastTokenRefresh = vi.fn()
const me = vi.fn()

vi.mock('@/lib/api-client', () => ({
  setMemoryToken: (...args: unknown[]) => setMemoryToken(...args),
  authApi: { me: (...args: unknown[]) => me(...args) },
}))

vi.mock('@/hooks/useSession', () => ({
  SESSION_QUERY_KEY: ['session', 'me'],
  setLastKnownUser: (...args: unknown[]) => setLastKnownUser(...args),
  setLastTokenRefresh: (...args: unknown[]) => setLastTokenRefresh(...args),
}))

import { applyPlanClaimSession } from '@/lib/applyPlanClaimSession'

describe('applyPlanClaimSession', () => {
  beforeEach(() => {
    setMemoryToken.mockClear()
    setLastKnownUser.mockClear()
    setLastTokenRefresh.mockClear()
    me.mockReset()
  })

  it('does nothing when the claim did not issue a session', async () => {
    const queryClient = { setQueryData: vi.fn(), invalidateQueries: vi.fn() }
    const signedIn = await applyPlanClaimSession(
      { status: 'accepted', message: 'ok' },
      queryClient as never,
    )
    expect(signedIn).toBe(false)
    expect(setMemoryToken).not.toHaveBeenCalled()
  })

  it('stores tokens and hydrates /me like the magic-link page', async () => {
    me.mockResolvedValue({ id: 'u1', email: 'a@b.co' })
    const queryClient = { setQueryData: vi.fn(), invalidateQueries: vi.fn() }
    const signedIn = await applyPlanClaimSession(
      { status: 'accepted', message: 'ok', access_token: 'jwt', refresh_token: 'rt' },
      queryClient as never,
    )
    expect(signedIn).toBe(true)
    expect(setMemoryToken).toHaveBeenCalledWith('jwt', 'rt')
    expect(setLastKnownUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.co' })
    expect(queryClient.setQueryData).toHaveBeenCalled()
  })
})
