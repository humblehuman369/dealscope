import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTH_REDIRECT_STORAGE_KEY,
  consumeAuthRedirect,
  defaultAuthRedirect,
  oauthWebStartUrl,
  persistAuthRedirect,
  readAuthRedirect,
} from '@/lib/authRedirect'

describe('defaultAuthRedirect', () => {
  it('keeps the selected property when auth params are the only extras', () => {
    expect(defaultAuthRedirect('/discovery', '?address=123+Main+St&city=Austin&state=TX')).toBe(
      '/discovery?address=123+Main+St&city=Austin&state=TX',
    )
  })

  it('strips stale auth and redirect params', () => {
    expect(
      defaultAuthRedirect('/discovery', '?address=1+Oak&auth=register&redirect=%2F'),
    ).toBe('/discovery?address=1+Oak')
  })
})

describe('oauthWebStartUrl', () => {
  it('passes a same-origin next path to Google and Apple', () => {
    expect(oauthWebStartUrl('google', '/discovery?address=1+Oak')).toBe(
      '/api/v1/auth/google?next=%2Fdiscovery%3Faddress%3D1%2BOak',
    )
    expect(oauthWebStartUrl('apple', '/search')).toBe('/api/v1/auth/apple?next=%2Fsearch')
  })

  it('omits next for off-origin values', () => {
    expect(oauthWebStartUrl('google', 'https://evil.example/')).toBe('/api/v1/auth/google')
    expect(oauthWebStartUrl('google', '//evil.example')).toBe('/api/v1/auth/google')
  })
})

describe('auth redirect sessionStorage', () => {
  afterEach(() => {
    sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  })

  it('persists, reads, and consumes a same-origin path', () => {
    persistAuthRedirect('/discovery?address=1+Oak')
    expect(readAuthRedirect()).toBe('/discovery?address=1+Oak')
    expect(consumeAuthRedirect()).toBe('/discovery?address=1+Oak')
    expect(readAuthRedirect()).toBeNull()
  })

  it('ignores off-origin values', () => {
    persistAuthRedirect('https://evil.example/')
    expect(readAuthRedirect()).toBeNull()
  })
})
