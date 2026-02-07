import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Token Management (cookie-only — deprecated stubs)', () => {
    it('getAccessToken always returns null (cookie-only auth)', async () => {
      const { getAccessToken } = await import('@/lib/api')
      expect(getAccessToken()).toBeNull()
    })

    it('getRefreshToken always returns null (cookie-only auth)', async () => {
      const { getRefreshToken } = await import('@/lib/api')
      expect(getRefreshToken()).toBeNull()
    })

    it('storeTokens is a no-op', async () => {
      const { storeTokens } = await import('@/lib/api')
      // Should not throw
      expect(() => storeTokens('a', 'b')).not.toThrow()
    })

    it('clearTokens is a no-op', async () => {
      const { clearTokens } = await import('@/lib/api')
      // Should not throw
      expect(() => clearTokens()).not.toThrow()
    })
  })

  describe('API Endpoints', () => {
    it('api object contains expected endpoints', async () => {
      const { api } = await import('@/lib/api')

      // Verify structure
      expect(api).toHaveProperty('health')
      expect(api).toHaveProperty('properties')
      expect(api).toHaveProperty('analytics')
      expect(api).toHaveProperty('assumptions')
      expect(api).toHaveProperty('loi')

      // Verify nested endpoints
      expect(api.properties).toHaveProperty('search')
      expect(api.properties).toHaveProperty('get')
      expect(api.analytics).toHaveProperty('calculate')
      expect(api.loi).toHaveProperty('generate')
    })
  })
})
