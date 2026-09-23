import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}))

vi.mock('@/lib/eventTracking', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/lib/api/plans', () => ({
  requestPlanNarrative: vi.fn().mockResolvedValue({
    summary: 'template',
    pitch: '',
    source: 'template',
  }),
}))

import { DEAL_STRUCTURES_PATH } from '@/lib/dealStructures/recomputeStructures'
import {
  buildMakeItWorkRequest,
  useMakeItWork,
} from '@/components/iq-verdict/make-it-work/useMakeItWork'
import { EMPTY_ANSWERS, type WizardAnswers } from '@/components/iq-verdict/make-it-work/wizardMapping'

const ADDRESS = '7026 NW 21st Ave, Miami, FL 33147'
const BASE_INPUTS = {
  list_price: 400_000,
  monthly_rent: 2_500,
  property_taxes: 5_000,
  insurance: 4_000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_200,
  purchase_price: 350_000,
  dismissed_families: ['income'],
}

const PRICE_PATH = {
  id: 'price-negotiation',
  family: 'price',
  family_label: 'Price',
  realism_label: 'Most realistic',
  headline: 'Ask less',
  bullets: [],
  summary: 'Cut the price.',
  levers: [],
  monthly_savings: 400,
  monthly_cash_flow: 80,
  cash_required: 70_000,
  ranking_score: 80,
}

const STRUCTURES_RESPONSE = {
  paths: [PRICE_PATH],
  has_paths: true,
  breakeven_summary: {
    list_price: 400_000,
    gap_amount: 30_000,
    gap_pct: 7.5,
    monthly_shortfall: 320,
    income_value: 380_000,
    target_buy_price: 370_000,
    baseline_cash_required: 80_000,
  },
}

const SIMPLE_ANSWERS: WizardAnswers = {
  cash: '25_75k',
  priority: 'lowest_price',
  terms: 'simple',
  ownerOccupy: null,
}

describe('buildMakeItWorkRequest', () => {
  it('stamps the property address and drops stale buy-price / dismissals', () => {
    const request = buildMakeItWorkRequest(BASE_INPUTS, SIMPLE_ANSWERS, 400_000, ADDRESS)
    expect(request.address).toBe(ADDRESS)
    expect(request).not.toHaveProperty('purchase_price')
    expect(request.dismissed_families).toEqual(['financing', 'blended'])
    expect(request.list_price).toBe(400_000)
    expect(request.down_payment_pct).toEqual(expect.any(Number))
  })

  it('does not invent an address when the wizard was opened without one', () => {
    const request = buildMakeItWorkRequest(BASE_INPUTS, EMPTY_ANSWERS, 400_000, '  ')
    expect(request).not.toHaveProperty('address')
  })
})

describe('useMakeItWork compute', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
    mockApiPost.mockResolvedValue(STRUCTURES_RESPONSE)
  })

  const hookArgs = {
    open: true,
    baseInputs: BASE_INPUTS,
    address: ADDRESS,
    listPrice: 400_000,
    targetBuyPrice: 350_000,
    incomeValue: 380_000,
    unitCount: null,
    focusFamily: null,
    saveOnly: false,
  } as const

  it('re-solves on the structures path with the same house address, never /analysis/verdict', async () => {
    const { result } = renderHook(() => useMakeItWork(hookArgs))

    act(() => result.current.answerCash('25_75k'))
    act(() => result.current.answerPriority('lowest_price'))
    act(() => result.current.answerTerms('simple'))

    await waitFor(() => expect(result.current.phase).toBe('result'))

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(mockApiPost.mock.calls[0][0]).toBe(DEAL_STRUCTURES_PATH)
    expect(mockApiPost.mock.calls[0][0]).not.toBe('/api/v1/analysis/verdict')
    expect(mockApiPost.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        address: ADDRESS,
        list_price: 400_000,
        dismissed_families: ['financing', 'blended'],
      }),
    )
    expect(mockApiPost.mock.calls[0][1]).not.toHaveProperty('purchase_price')
    expect(mockApiPost.mock.calls[0][2]).toEqual({ softAuth: true })
    expect(result.current.recommended?.id).toBe('price-negotiation')
    expect(result.current.numbers.targetBuyPrice).toBe(370_000)
    expect(result.current.numbers.monthlyShortfall).toBe(320)
  })

  it('shows the retry copy when the re-solve fails', async () => {
    mockApiPost.mockRejectedValue(new Error('ANONYMOUS_LIMIT_REACHED'))
    const { result } = renderHook(() => useMakeItWork(hookArgs))

    act(() => result.current.answerCash('25_75k'))
    act(() => result.current.answerPriority('lowest_price'))
    act(() => result.current.answerTerms('simple'))

    await waitFor(() => expect(result.current.phase).toBe('error'))
    expect(result.current.errorMessage).toBe("We couldn't run the numbers just now. Try again in a moment.")
  })
})
