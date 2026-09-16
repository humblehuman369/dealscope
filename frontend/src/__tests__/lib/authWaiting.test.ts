import { afterEach, describe, expect, it } from 'vitest'

import {
  AUTH_WAITING_KEY,
  clearAuthWaiting,
  isAuthWaitingInThisTab,
  markAuthWaiting,
  safePostLoginPath,
} from '@/lib/authWaiting'

describe('authWaiting', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('sets and clears the waiting flag in this tab only', () => {
    expect(isAuthWaitingInThisTab()).toBe(false)
    markAuthWaiting()
    expect(sessionStorage.getItem(AUTH_WAITING_KEY)).toBe('1')
    expect(isAuthWaitingInThisTab()).toBe(true)
    clearAuthWaiting()
    expect(isAuthWaitingInThisTab()).toBe(false)
  })

  it('refuses off-origin post-login paths', () => {
    expect(safePostLoginPath('/onboarding')).toBe('/onboarding')
    expect(safePostLoginPath('https://evil.example/x')).toBe('/onboarding')
    expect(safePostLoginPath('//evil.example/x')).toBe('/onboarding')
  })
})
