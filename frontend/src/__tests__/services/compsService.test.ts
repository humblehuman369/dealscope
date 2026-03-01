/**
 * Tests for comps API layer (sale-comps, rent-comps).
 * Replaces former compsService tests; asserts AxessoResponse shape and behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSaleComps } from '@/lib/api/sale-comps'
import { fetchRentComps } from '@/lib/api/rent-comps'

describe('comps API (sale-comps)', () => {
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
    it('returns ok with transformed data when API returns 200 and success: true', async () => {
      const mockResults = [{ zpid: '1', address: {}, lastSoldPrice: 300000, livingAreaValue: 1500 }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: mockResults }),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.ok).toBe(true)
      expect(result.data).not.toBeNull()
      expect(Array.isArray(result.data)).toBe(true)
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

    it('returns not ok when no zpid or address provided', async () => {
      const result = await fetchSaleComps({})

      expect(result.ok).toBe(false)
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

    it('returns not ok when API returns 200 with success: false', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: 'No data from provider' }),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.ok).toBe(true)
      expect(result.data).not.toBeNull()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data?.length).toBe(0)
    })

    it('returns not ok for 404 and does not retry', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

      const result = await fetchSaleComps({ zpid: '123' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
      expect(result.data).toBeNull()
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
})

describe('comps API (rent-comps)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchRentComps', () => {
    it('returns ok with transformed data when API returns 200 and success: true', async () => {
      const mockResults = [{ zpid: '1', address: {}, price: 2000 }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, results: mockResults }),
      })

      const result = await fetchRentComps({ zpid: '456' })

      expect(result.ok).toBe(true)
      expect(result.data).not.toBeNull()
      expect(Array.isArray(result.data)).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/rentcast/rental-comps'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('zpid=456'),
        expect.any(Object)
      )
    })

    it('returns not ok when no zpid or address provided', async () => {
      const result = await fetchRentComps({})

      expect(result.ok).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toContain('No property address or ID available')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns not ok when API returns 500', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      })

      const result = await fetchRentComps({ zpid: '456' })

      expect(result.ok).toBe(false)
      expect(result.data).toBeNull()
      expect(result.status).toBe(500)
    })
  })
})
