import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the module before importing
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api') as any
  return {
    ...actual,
    // We'll test the actual exports
  }
})

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null)
  })

  describe('Token Management', () => {
    it('getAccessToken returns null when no token exists', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)
      
      const { getAccessToken } = await import('@/lib/api')
      const token = getAccessToken()
      
      expect(token).toBeNull()
      expect(localStorage.getItem).toHaveBeenCalledWith('access_token')
    })

    it('getAccessToken returns token when it exists', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('test-token')
      
      const { getAccessToken } = await import('@/lib/api')
      const token = getAccessToken()
      
      expect(token).toBe('test-token')
    })

    it('storeTokens saves both tokens to localStorage', async () => {
      const { storeTokens } = await import('@/lib/api')
      storeTokens('access-token-123', 'refresh-token-456')
      
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token-123')
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token-456')
    })

    it('clearTokens removes both tokens from localStorage', async () => {
      const { clearTokens } = await import('@/lib/api')
      clearTokens()
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
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
