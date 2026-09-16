import { describe, expect, it } from 'vitest'
import { capacitorAppOrigin, capacitorOauthStartUrl } from '@/lib/capacitorOauth'

describe('capacitorOauthStartUrl', () => {
  it('never emits a relative URL', () => {
    const url = capacitorOauthStartUrl('apple')
    expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true)
    expect(url).toContain('/api/v1/auth/apple?mobile_redirect=')
    expect(url).toContain(encodeURIComponent('dealgapiq://auth/callback'))
  })

  it('builds a google start URL on the same origin pattern', () => {
    const url = capacitorOauthStartUrl('google')
    expect(url).toContain('/api/v1/auth/google?mobile_redirect=')
  })

  it('forwards a same-origin next path', () => {
    const url = capacitorOauthStartUrl('google', '/discovery?address=1+Oak')
    expect(url).toContain('next=%2Fdiscovery%3Faddress%3D1%2BOak')
  })

  it('falls back to production origin when window is unavailable', () => {
    expect(capacitorAppOrigin()).toMatch(/^https?:\/\//)
  })
})
