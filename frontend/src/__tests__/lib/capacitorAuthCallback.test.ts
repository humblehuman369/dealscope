import { describe, expect, it, vi } from 'vitest'
import {
  exchangeCapacitorOauthCode,
  parseCapacitorAuthUrl,
} from '@/lib/capacitorAuthCallback'

describe('parseCapacitorAuthUrl', () => {
  it('reads a one-time OAuth code from the native callback', () => {
    expect(parseCapacitorAuthUrl('dealgapiq://auth/callback?code=abc123token')).toEqual({
      type: 'oauth-code',
      code: 'abc123token',
    })
  })

  it('does not accept tokens in the callback query string', () => {
    expect(
      parseCapacitorAuthUrl(
        'dealgapiq://auth/callback?access_token=stolen&refresh_token=also-stolen',
      ),
    ).toEqual({ type: 'ignored' })
  })

  it('forwards OAuth errors to the login screen', () => {
    expect(parseCapacitorAuthUrl('dealgapiq://auth/callback?error=google_token_failed')).toEqual({
      type: 'oauth-error',
      error: 'google_token_failed',
    })
  })

  it('forwards magic-link params', () => {
    expect(parseCapacitorAuthUrl('dealgapiq://auth/magic?token=ml-1&next=%2Fsearch')).toEqual({
      type: 'magic',
      token: 'ml-1',
      next: '/search',
    })
  })

  it('ignores unrelated URLs', () => {
    expect(parseCapacitorAuthUrl('https://dealgapiq.com/search')).toEqual({ type: 'ignored' })
  })
})

describe('exchangeCapacitorOauthCode', () => {
  it('POSTs the code to the exchange endpoint via the provided client', async () => {
    const exchange = vi.fn().mockResolvedValue({
      access_token: 'jwt',
      refresh_token: 'rt',
    })

    const tokens = await exchangeCapacitorOauthCode('one-time-code-value-32chars-min', exchange)

    expect(exchange).toHaveBeenCalledTimes(1)
    expect(exchange).toHaveBeenCalledWith('one-time-code-value-32chars-min')
    expect(tokens).toEqual({ access_token: 'jwt', refresh_token: 'rt' })
  })
})
