import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMakeItWork } from '@/components/iq-verdict/make-it-work/useMakeItWork'
import { api } from '@/lib/api-client'
import { DEAL_STRUCTURES_PATH } from '@/lib/dealStructures/recomputeStructures'

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn() },
}))

vi.mock('@/lib/eventTracking', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/lib/api/plans', () => ({
  requestPlanNarrative: vi.fn().mockResolvedValue({
    summary: 'A plan',
    pitch: 'Here is the pitch',
    source: 'template',
  }),
}))

const ADDRESS = '7026 NW 21st Ave, Miami, FL 33147'

const BASE_INPUTS = {
  list_price: 460_000,
  monthly_rent: 2_200,
  purchase_price: 400_000,
  dismissed_families: ['financing'],
  state: 'FL',
  bedrooms: 3,
  sqft: 1060,
}

function renderWizard() {
  return renderHook(() =>
    useMakeItWork({
      open: true,
      baseInputs: BASE_INPUTS,
      address: ADDRESS,
      listPrice: 460_000,
      targetBuyPrice: 400_000,
      incomeValue: 410_000,
      unitCount: 1,
      focusFamily: null,
      saveOnly: false,
    }),
  )
}

const STRUCTURES = {
  hasPaths: true,
  paths: [
    {
      id: 'price-1',
      family: 'price',
      familyLabel: 'Price',
      headline: 'Offer less',
      bullets: [],
      summary: 'Buy closer to the income value',
      levers: [],
      monthlySavings: 400,
      cashRequired: 80_000,
      rankingScore: 10,
    },
  ],
  breakevenSummary: {
    listPrice: 460_000,
    baselineCashRequired: 100_000,
    gapAmount: 50_000,
    gapPct: 10.9,
    monthlyShortfall: 350,
    incomeValue: 420_000,
    targetBuyPrice: 399_000,
  },
}

describe('useMakeItWork', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('re-solves on the structures endpoint and does not spend an analysis', async () => {
    vi.mocked(api.post).mockResolvedValue(STRUCTURES)
    const { result } = renderWizard()

    await act(async () => {
      result.current.answerCash('25_75k')
    })
    await act(async () => {
      result.current.answerPriority('lowest_price')
    })
    await act(async () => {
      result.current.answerTerms('simple')
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('result')
    })

    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith(
      DEAL_STRUCTURES_PATH,
      expect.objectContaining({
        address: ADDRESS,
        list_price: 460_000,
        down_payment_pct: expect.any(Number),
        dismissed_families: ['financing', 'blended'],
      }),
      { softAuth: true },
    )
    const body = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('purchase_price')
    expect(DEAL_STRUCTURES_PATH).not.toBe('/api/v1/analysis/verdict')
    expect(result.current.recommended?.id).toBe('price-1')
    expect(result.current.numbers).toMatchObject({
      listPrice: 460_000,
      targetBuyPrice: 399_000,
      incomeValue: 420_000,
      monthlyShortfall: 350,
    })
  })

  it('shows the retry state when the solve fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('403'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderWizard()

    await act(async () => {
      result.current.answerCash('75_150k')
    })
    await act(async () => {
      result.current.answerPriority('cash_flow')
    })
    await act(async () => {
      result.current.answerTerms('anything')
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })
    expect(result.current.errorMessage).toMatch(/couldn't run the numbers/i)
    errorSpy.mockRestore()
  })
})
