import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sanitizeVerdictInputForExcel } from '@/features/strategy/exportComprehensiveExcel'

describe('sanitizeVerdictInputForExcel', () => {
  it('drops non-positive arv so IQVerdictInput does not 422', () => {
    const out = sanitizeVerdictInputForExcel({
      list_price: 300000,
      monthly_rent: 1800,
      arv: 0,
    })
    expect(out.arv).toBeUndefined()
    expect(out.list_price).toBe(300000)
  })

  it('replaces a missing or zero list_price with 1', () => {
    expect(sanitizeVerdictInputForExcel({ list_price: 0 }).list_price).toBe(1)
    expect(sanitizeVerdictInputForExcel({}).list_price).toBe(1)
  })

  it('normalizes occupancy percent to a 0–1 fraction and drops out-of-range', () => {
    expect(sanitizeVerdictInputForExcel({ list_price: 1, occupancy_rate: 75 }).occupancy_rate).toBe(
      0.75,
    )
    expect(
      sanitizeVerdictInputForExcel({ list_price: 1, occupancy_rate: 150 }).occupancy_rate,
    ).toBeUndefined()
  })

  it('drops state values that are not a 2-letter code', () => {
    const out = sanitizeVerdictInputForExcel({
      list_price: 1,
      state: 'Florida',
      owner_state: 'TX',
    })
    expect(out.state).toBeUndefined()
    expect(out.owner_state).toBe('TX')
  })

  it('converts interest_rate percent to a decimal when above 30%', () => {
    expect(sanitizeVerdictInputForExcel({ list_price: 1, interest_rate: 6.5 }).interest_rate).toBe(
      0.065,
    )
  })
})

describe('downloadComprehensiveExcel', () => {
  const fetchMock = vi.fn()
  const click = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    click.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-xlsx')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POSTs a sanitized body and triggers a download for a ZIP/xlsx blob', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'attachment; filename="DealGapIQ_Comprehensive_test.xlsx"' },
      blob: async () => new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      json: async () => ({}),
    })

    const { downloadComprehensiveExcel } = await import(
      '@/features/strategy/exportComprehensiveExcel'
    )
    await downloadComprehensiveExcel({
      propertyId: 'abc123',
      address: '123 Main St',
      activeStrategy: 'ltr',
      verdictInput: { list_price: 250000, arv: 0 },
    })

    expect(fetchMock).toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.verdict_input.arv).toBeUndefined()
    expect(body.verdict_input.list_price).toBe(250000)
    expect(body.active_strategy).toBe('ltr')
    expect(click).toHaveBeenCalled()
  })

  it('rejects a non-xlsx (HTML) success body so the caller can fall back', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      blob: async () => new Blob(['<html>error</html>'], { type: 'text/html' }),
      json: async () => ({}),
    })

    const { downloadComprehensiveExcel } = await import(
      '@/features/strategy/exportComprehensiveExcel'
    )
    await expect(
      downloadComprehensiveExcel({
        propertyId: 'abc123',
        address: '123 Main St',
        activeStrategy: 'ltr',
        verdictInput: { list_price: 250000 },
      }),
    ).rejects.toThrow('Failed to generate Excel report.')
    expect(click).not.toHaveBeenCalled()
  })
})
