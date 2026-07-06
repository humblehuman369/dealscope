import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Provide required env var before module import
process.env.NEXT_PUBLIC_API_URL = 'https://test.example.com'

describe('API Client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    // Reset document.cookie for CSRF tests
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('apiRequest basics', () => {
    it('makes GET request with correct headers', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      })

      const { apiRequest } = await import('@/lib/api-client')
      const result = await apiRequest('/api/v1/test')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
      expect(result).toEqual({ data: 'test' })
    })

    it('makes POST request with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const { apiRequest } = await import('@/lib/api-client')
      await apiRequest('/api/v1/test', {
        method: 'POST',
        body: { key: 'value' },
      })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
        }),
      )
    })

    it('returns undefined for 204 No Content', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const { apiRequest } = await import('@/lib/api-client')
      const result = await apiRequest('/api/v1/test', { method: 'DELETE' })

      expect(result).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('throws ApiError with status and message on non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ detail: 'Bad request data' }),
        json: async () => ({ detail: 'Bad request data' }),
      })

      const { apiRequest, ApiError } = await import('@/lib/api-client')

      await expect(apiRequest('/api/v1/test')).rejects.toThrow('Bad request data')
      try {
        await apiRequest('/api/v1/test')
      } catch (e) {
        // Reset modules and re-mock for this second call
      }
    })

    it('handles non-JSON error responses gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'not json body',
      })

      const { apiRequest } = await import('@/lib/api-client')

      await expect(apiRequest('/api/v1/test')).rejects.toThrow('Server error')
    })
  })

  describe('CSRF token', () => {
    it('attaches X-CSRF-Token header on POST requests', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf_token=test-csrf-123; other_cookie=foo',
      })

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      const { apiRequest } = await import('@/lib/api-client')
      await apiRequest('/api/v1/test', { method: 'POST' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-123',
          }),
        }),
      )
    })

    it('does not attach CSRF token on GET requests', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf_token=test-csrf-123',
      })

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      const { apiRequest } = await import('@/lib/api-client')
      await apiRequest('/api/v1/test')

      const headers = fetchMock.mock.calls[0][1].headers
      expect(headers['X-CSRF-Token']).toBeUndefined()
    })
  })

  describe('memory token', () => {
    it('sets and reads memory token within TTL', async () => {
      const { setMemoryToken } = await import('@/lib/api-client')

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      setMemoryToken('test-token-abc')

      const { apiRequest } = await import('@/lib/api-client')
      await apiRequest('/api/v1/test')

      const headers = fetchMock.mock.calls[0][1].headers
      expect(headers['Authorization']).toBe('Bearer test-token-abc')
    })

    it('clearMemoryToken removes the token', async () => {
      const { setMemoryToken, clearMemoryToken, apiRequest } = await import('@/lib/api-client')

      setMemoryToken('token-to-clear')
      clearMemoryToken()

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      await apiRequest('/api/v1/test')

      const headers = fetchMock.mock.calls[0][1].headers
      expect(headers['Authorization']).toBeUndefined()
    })
  })

  describe('401 token refresh', () => {
    it('retries request after successful refresh on 401', async () => {
      // First call returns 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: 'Unauthorized' }),
        json: async () => ({ detail: 'Unauthorized' }),
      })
      // Refresh call succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })
      // Retry call succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'refreshed' }),
      })

      const { apiRequest } = await import('@/lib/api-client')
      const result = await apiRequest('/api/v1/test')

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ data: 'refreshed' })
    })

    it('throws error when refresh fails', async () => {
      // First call returns 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: 'Unauthorized' }),
        json: async () => ({ detail: 'Unauthorized' }),
      })
      // Refresh fails
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: 'Unauthorized' }),
      })

      const { apiRequest } = await import('@/lib/api-client')

      await expect(apiRequest('/api/v1/test')).rejects.toThrow('Unauthorized')
    })

    it('skips refresh when skipAuth is true', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: 'Unauthorized' }),
        json: async () => ({ detail: 'Unauthorized' }),
      })

      const { apiRequest } = await import('@/lib/api-client')

      await expect(apiRequest('/api/v1/test', { skipAuth: true })).rejects.toThrow('Unauthorized')

      // Only 1 call — no refresh attempt
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('apiFetchRaw (binary downloads)', () => {
    it('returns the raw Response and attaches CSRF on POST', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf_token=dl-csrf-456',
      })

      const rawResponse = { ok: true, status: 200, blob: async () => new Blob() }
      fetchMock.mockResolvedValueOnce(rawResponse)

      const { apiFetchRaw } = await import('@/lib/api-client')
      const response = await apiFetchRaw('/api/v1/reports/property/x/comprehensive-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

      expect(response).toBe(rawResponse)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/reports/property/x/comprehensive-excel',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: '{}',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'dl-csrf-456',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('recovers from an expired session: 401 → silent refresh → authorized retry', async () => {
      fetchMock
        // Download rejected (expired access token)
        .mockResolvedValueOnce({ ok: false, status: 401 })
        // Silent token refresh succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'fresh-dl-token' }),
        })
        // Retried download succeeds
        .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => new Blob() })

      const { apiFetchRaw, clearMemoryToken } = await import('@/lib/api-client')
      const response = await apiFetchRaw('/api/v1/proforma/property/x/excel?address=1+Main+St')

      expect(response.ok).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock.mock.calls[1][0]).toEqual(expect.stringContaining('/api/v1/auth/refresh'))
      const retryHeaders = fetchMock.mock.calls[2][1].headers as Record<string, string>
      expect(retryHeaders['Authorization']).toBe('Bearer fresh-dl-token')

      clearMemoryToken()
    })

    it('returns the 401 Response unchanged when refresh fails (caller shows sign-in message)', async () => {
      const unauthorized = { ok: false, status: 401 }
      fetchMock
        .mockResolvedValueOnce(unauthorized)
        // Refresh fails
        .mockResolvedValueOnce({ ok: false, status: 401 })

      const { apiFetchRaw } = await import('@/lib/api-client')
      const response = await apiFetchRaw('/api/v1/proforma/property/x/excel')

      expect(response.status).toBe(401)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('api convenience methods', () => {
    it('api.get makes GET request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      })

      const { api } = await import('@/lib/api-client')
      await api.get('/api/v1/data')

      expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    })

    it('api.post makes POST request with body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '1' }),
      })

      const { api } = await import('@/lib/api-client')
      await api.post('/api/v1/data', { name: 'test' })

      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'test' }))
    })

    it('api.delete makes DELETE request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const { api } = await import('@/lib/api-client')
      await api.delete('/api/v1/data/1')

      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })
  })
})
