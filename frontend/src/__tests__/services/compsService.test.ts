import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSaleComps, fetchRentComps, type CompResult } from '@/services/compsService'

describe('compsService', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('fetchSaleComps', () => {
    it('returns success with data when API returns 200 and success: true', async () => {
      const mockResults = [{ zpid: '1', address: {}, lastSoldPrice: 300000 }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: mockResults }),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect((result as CompResult<{ results?: unknown[] }>).data?.results).toEqual(mockResults)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/similar-sold'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('zpid=123'),
        expect.any(Object)
      )
    })

    it('returns failed when no zpid or address provided', async () => {
      const result = await fetchSaleComps({})

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('No property address or ID available')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('uses address when zpid not provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: [] }),
      })

      await fetchSaleComps({ address: '123 Main St, City, ST 12345' })

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('address='),
        expect.any(Object)
      )
    })

    it('returns failed when API returns 200 with success: false', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: 'No data from provider' }),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('No data from provider')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('retries when API returns 200 with success: false and error contains 502', async () => {
      vi.useFakeTimers()
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: false, error: 'AXESSO 502 Bad Gateway' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, results: [] }),
        })

      const resultPromise = fetchSaleComps({ zpid: '123' }, { maxRetries: 3 })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await resultPromise

      expect(result.status).toBe('success')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('returns failed for 404 and does not retry', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.status).toBe('failed')
      expect(result.httpStatus).toBe(404)
      expect(result.error).toContain('No comps available')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('passes limit, offset, and exclude_zpids when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: [] }),
      })

      await fetchSaleComps({
        zpid: '123',
        limit: 5,
        offset: 10,
        exclude_zpids: '1,2,3',
      })

      const callUrl = fetchMock.mock.calls[0][0]
      expect(callUrl).toMatch(/limit=5/)
      expect(callUrl).toMatch(/offset=10/)
      expect(callUrl).toMatch(/exclude_zpids=1%2C2%2C3/)
    })
  })

  describe('fetchRentComps', () => {
    it('returns success with data when API returns 200 and success: true', async () => {
      const mockResults = [{ zpid: '1', address: {}, price: 2000 }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: mockResults }),
      })

      const result = await fetchRentComps({ zpid: '456' })

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect((result as CompResult<{ results?: unknown[] }>).data?.results).toEqual(mockResults)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/similar-rent'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('zpid=456'),
        expect.any(Object)
      )
    })

    it('returns failed when no zpid or address provided', async () => {
      const result = await fetchRentComps({})

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('No property address or ID available')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns failed when API returns 500', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      })

      const result = await fetchRentComps({ zpid: '456' })

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.httpStatus).toBe(500)
    })

    it('retries on 502 when maxRetries allows', async () => {
      vi.useFakeTimers()
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: async () => ({ error: 'Bad Gateway' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, results: [] }),
        })

      const resultPromise = fetchRentComps(
        { zpid: '456' },
        { maxRetries: 3, timeout: 5000 }
      )
      await vi.advanceTimersByTimeAsync(3000)
      const result = await resultPromise

      expect(result.status).toBe('success')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
